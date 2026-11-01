import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseService, DatabaseAutomationService, InMemoryDatabaseRepository, AUTOMATION_ERRORS as E, type DatabaseAutomationRule, type DatabasePolicy, type DatabaseRepository } from "../../src/database/index.js";
async function fixture() {
  let clock = Date.now() + 1000, allowed = true;
  const repository = new InMemoryDatabaseRepository();
  const policy: DatabasePolicy = { assert: async (actor, _id, action) => { if (!allowed || actor === "denied" || (actor === "reader" && action !== "read")) throw new Error(E.DENIED); }, canReadRecord: async (actor, _id, record) => actor !== "limited" || record.id !== "hidden", canWriteRecord: async actor => actor !== "reader" };
  const domain = (actor: string, target: DatabaseRepository = repository) => { void actor; return new DatabaseService(target, policy); };
  await domain("owner").create("owner", { id: "db", title: "Tasks", properties: [{ id: "title", name: "Title", type: "text" }, { id: "status", name: "Status", type: "select", options: ["todo", "done"] }, { id: "amount", name: "Amount", type: "number" }], records: [] });
  const effects: { keys: string[]; delivered: Set<string>; failures: number } = { keys: [], delivered: new Set(), failures: 0 };
  const service = new DatabaseAutomationService(repository, { domain, assert: (actor, id, action) => policy.assert(actor, id, action), now: () => clock,
    webhook: async (_id, payload, key) => { effects.keys.push(key); assert.deepEqual(Object.keys(payload.values), ["title"]); effects.delivered.add(key); if (effects.failures-- > 0) throw new Error("timeout-after-delivery"); } });
  const revision = async () => (await repository.read("db"))!.revision;
  return { repository, domain, service, effects, revision, advance: (ms: number) => { clock += ms; }, revoke: () => { allowed = false; }, now: () => clock };
}
const rule: DatabaseAutomationRule = { id: "finish", name: "Finish new tasks", enabled: true, trigger: { kind: "created" }, actions: [{ kind: "patch", values: { status: "done" } }] };
test("record source, durable job and effect checkpoint commit atomically without recursion", async () => {
  const f = await fixture();
  await f.service.configure("owner", "db", [rule], 1);
  await f.domain("owner").upsertRecord("owner", "db", { id: "a", values: { title: "A", status: "todo" } }, 2);
  assert.equal((await f.repository.read("db"))?.automation?.jobs[0]?.status, "queued");
  assert.equal("automation" in (await f.domain("reader").query("reader", "db")).database, false);
  await f.service.tick("db");
  const stored = await f.repository.read("db");
  assert.equal(stored?.records[0]?.values["status"], "done");
  assert.equal(stored?.automation?.jobs.length, 1); assert.equal(stored?.automation?.jobs[0]?.status, "succeeded");
  assert.equal(stored?.automation?.jobs[0]?.step, 1);
  await f.service.tick("db"); assert.equal(await f.revision(), stored?.revision);
  await assert.rejects(f.service.configure("reader", "db", [], await f.revision()), /denied/);
  const publicState = await f.service.read("owner", "db"); assert.equal("actor" in publicState.jobs[0]!, false);
});
test("automation configuration and run history are scoped to their trusted owner", async () => {
  const f = await fixture();
  await f.service.configure("owner", "db", [rule], 1);
  await f.service.configure("other", "db", [{ ...rule, id: "other-rule" }], 2);
  assert.deepEqual((await f.service.read("owner", "db")).rules.map(item => item.id), ["finish"]);
  assert.deepEqual((await f.service.read("other", "db")).rules.map(item => item.id), ["other-rule"]);
  await assert.rejects(f.service.configure("other", "db", [rule], 3), /invalid/);
  await f.service.configure("owner", "db", [], 3);
  assert.deepEqual((await f.repository.read("db"))?.automation?.rules.map(item => item.id), ["other-rule"]);
});
test("conditions and changed-property triggers use typed values; stale config cancels queued actions", async () => {
  const f = await fixture();
  await f.service.configure("owner", "db", [{ ...rule, trigger: { kind: "propertyChanged", propertyId: "amount" }, condition: { kind: "condition", propertyId: "amount", operator: "greater", value: 2 } }], 1);
  await f.domain("owner").upsertRecord("owner", "db", { id: "a", values: { title: "A", amount: 0 } }, 2);
  assert.equal((await f.repository.read("db"))?.automation?.jobs.length, 0);
  await f.domain("owner").mutate("owner", "db", [{ kind: "patch", recordId: "a", values: { amount: 1 } }], 3);
  await f.service.tick("db"); assert.equal((await f.repository.read("db"))?.automation?.jobs[0]?.status, "cancelled");
  await f.domain("owner").mutate("owner", "db", [{ kind: "patch", recordId: "a", values: { amount: 4 } }], await f.revision());
  await f.service.configure("owner", "db", [{ ...rule, enabled: false }], await f.revision());
  await f.service.tick("db"); assert.equal((await f.repository.read("db"))?.records[0]?.values["status"], undefined);
  assert.equal((await f.repository.read("db"))?.automation?.jobs.at(-1)?.status, "cancelled");
});
test("webhook retries keep one idempotency key and do not repeat an already committed DB step", async () => {
  const f = await fixture(); f.effects.failures = 1;
  await f.service.configure("owner", "db", [{ ...rule, actions: [...rule.actions, { kind: "webhook", targetId: "registered", propertyIds: ["title"] }] }], 1);
  await f.domain("owner").upsertRecord("owner", "db", { id: "a", values: { title: "A" } }, 2);
  await f.service.tick("db");
  const failed = (await f.repository.read("db"))!;
  assert.equal(failed.automation?.jobs[0]?.status, "retry"); assert.equal(failed.automation?.jobs[0]?.step, 1);
  assert.equal(failed.records[0]?.values["status"], "done");
  f.advance(2000); await f.service.tick("db");
  assert.equal((await f.repository.read("db"))?.automation?.jobs[0]?.status, "succeeded");
  assert.equal((await f.repository.read("db"))?.automation?.jobs[0]?.error, undefined);
  assert.equal(f.effects.keys.length, 2); assert.equal(new Set(f.effects.keys).size, 1); assert.equal(f.effects.delivered.size, 1);
});
test("schedules coalesce downtime, run typed actions and do not replay a completed occurrence", async () => {
  const f = await fixture();
  await f.domain("owner").upsertRecord("owner", "db", { id: "a", values: { title: "A" } }, 1);
  await f.service.configure("owner", "db", [{ ...rule, trigger: { kind: "schedule", startAt: new Date(f.now() - 600000).toISOString(), intervalMinutes: 1 } }], 2);
  await f.service.tick("db"); const state = (await f.repository.read("db"))!;
  assert.equal(state.records[0]?.values["status"], "done"); assert.equal(state.automation?.jobs.length, 1);
  assert.ok(Date.parse(state.automation!.rules[0]!.nextAt!) > f.now());
  await f.service.tick("db"); assert.equal(await f.revision(), state.revision);
  f.advance(61000); await f.service.tick("db"); assert.equal((await f.repository.read("db"))?.automation?.jobs.length, 2);
});
test("worker takeover after lease expiry does not commit a stale claim; revocation cancels work", async () => {
  const f = await fixture(); await f.service.configure("owner", "db", [rule], 1);
  await f.domain("owner").upsertRecord("owner", "db", { id: "a", values: {} }, 2);
  const stored = (await f.repository.read("db"))!; stored.revision++; const job = stored.automation!.jobs[0]!;
  job.status = "running"; job.attempts = 1; job.lease = { token: "dead-worker", until: new Date(f.now() - 1).toISOString() };
  await f.repository.write(stored, stored.revision - 1); await f.service.tick("db");
  assert.equal((await f.repository.read("db"))?.automation?.jobs[0]?.status, "succeeded");
  await f.domain("owner").upsertRecord("owner", "db", { id: "b", values: {} }, await f.revision());
  f.revoke(); await f.service.tick("db");
  const result = (await f.repository.read("db"))!;
  assert.equal(result.records.find(row => row.id === "b")?.values["status"], undefined);
  assert.equal(result.automation?.jobs.at(-1)?.error, E.DENIED);
});
test("failed external effects expose history and explicit retry keeps the original idempotency key", async () => {
  const f = await fixture(); f.effects.failures = 10;
  await f.service.configure("owner", "db", [{ ...rule, actions: [{ kind: "webhook", targetId: "registered", propertyIds: ["title"] }] }], 1);
  await f.domain("owner").upsertRecord("owner", "db", { id: "a", values: { title: "A" } }, 2);
  for (let attempt = 0; attempt < 5; attempt++) { await f.service.tick("db"); f.advance(61000); }
  const failed = (await f.service.read("owner", "db")).jobs[0]!;
  assert.equal(failed.status, "failed"); assert.equal(failed.attempts, 5);
  await assert.rejects(f.service.retry("reader", "db", failed.id, await f.revision()), /denied/);
  f.effects.failures = 0; await f.service.retry("owner", "db", failed.id, await f.revision()); await f.service.tick("db");
  assert.equal((await f.service.read("owner", "db")).jobs[0]?.status, "succeeded"); assert.equal(new Set(f.effects.keys).size, 1);
});
test("DB effects and receipts roll back together on CAS failure and resume after the lease", async () => {
  let now = Date.now() + 1000, rejectEffect = true;
  const stored = new InMemoryDatabaseRepository();
  const repository: DatabaseRepository = { read: id => stored.read(id), write: async (state, revision) => { if (rejectEffect && state.automation?.jobs[0]?.step === 1) { rejectEffect = false; return false; } return stored.write(state, revision); } };
  const policy: DatabasePolicy = { assert: async () => undefined, canReadRecord: async () => true, canWriteRecord: async () => true };
  const domain = (_actor: string, target: DatabaseRepository) => new DatabaseService(target, policy);
  const database = domain("owner", repository), automations = new DatabaseAutomationService(repository, { domain, assert: async () => undefined, now: () => now });
  await database.create("owner", { id: "db", title: "Tasks", properties: [{ id: "status", name: "Status", type: "text" }], records: [] });
  await automations.configure("owner", "db", [rule], 1);
  await database.upsertRecord("owner", "db", { id: "a", values: { status: "todo" } }, 2);
  await automations.tick("db");
  assert.equal((await stored.read("db"))?.records[0]?.values["status"], "todo");
  assert.equal((await stored.read("db"))?.automation?.jobs[0]?.step, 0);
  now += 31000; await automations.tick("db");
  assert.equal((await stored.read("db"))?.records[0]?.values["status"], "done");
  assert.equal((await stored.read("db"))?.automation?.jobs[0]?.status, "succeeded");
});
