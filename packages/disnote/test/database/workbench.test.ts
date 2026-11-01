import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseService, InMemoryDatabaseRepository, RecordPageService, recordDocumentId, shiftRecordDates, type DatabasePolicy } from "../../src/database/index.js";
import { InMemoryDocumentRepository } from "../../src/storage/index.js";
import { articleRegistry, paragraph, text } from "../../src/core/index.js";
const policy: DatabasePolicy = {
  async assert(actor, _id, action) { if (actor === "denied" || (actor === "member" && action === "manage")) throw new Error("denied"); },
  async canReadRecord(actor, _id, record) { return actor === "admin" || record.id !== "secret"; },
  async canWriteRecord(actor, _id, before, after) { return actor === "admin" || (before?.id !== "secret" && after?.id !== "secret"); },
};
async function setup() {
  const repository = new InMemoryDatabaseRepository(), service = new DatabaseService(repository, policy);
  await service.create("admin", { id: "db", title: "Tasks", properties: [{ id: "title", name: "Title", type: "text" }, { id: "status", name: "Status", type: "select", options: ["todo", "done"] }, { id: "amount", name: "Amount", type: "number" }], records: [
    { id: "a", values: { title: "A", status: "todo", amount: 2 } }, { id: "b", values: { title: "B", status: "done", amount: 4 } }, { id: "secret", values: { title: "Hidden", status: "todo", amount: 100 } },
  ] }); return { service, repository };
}
test("bulk mutation is atomic, authorized and conflict-safe; manual order persists", async () => {
  const { service, repository } = await setup();
  await assert.rejects(service.mutate("member", "db", [{ kind: "patch", recordId: "a", values: { title: "Changed" } }, { kind: "delete", recordId: "secret" }], 1));
  assert.equal((await repository.read("db"))?.records[0]?.values["title"], "A");
  await assert.rejects(service.mutate("admin", "db", [{ kind: "patch", recordId: "a", values: { amount: "invalid" } }], 1));
  assert.equal((await repository.read("db"))?.revision, 1);
  await service.mutate("member", "db", [{ kind: "patch", recordId: "a", values: { status: "done" } }, { kind: "move", recordId: "b", beforeId: "a" }], 1);
  assert.deepEqual((await service.query("member", "db")).records.map(record => record.id), ["b", "a"]);
  await assert.rejects(service.mutate("member", "db", [{ kind: "delete", recordId: "a" }], 1), /revision-conflict/);
});
test("malformed untyped commands never commit a revision", async () => {
  const { service, repository } = await setup();
  for (const command of [{ kind: "unknown", recordId: "a" }, { kind: "patch", recordId: "a", values: null }, { kind: "patch", recordId: "a", values: [] }]) {
    await assert.rejects(service.mutate("admin", "db", [command] as never, 1), /invalid-database-value/);
    assert.equal((await repository.read("db"))?.revision, 1);
  }
});

test("saved views require management, validate columns/filters and forms enforce fields", async () => {
  const { service, repository } = await setup();
  const view = { id: "requests", name: "Requests", kind: "form" as const, columns: [{ propertyId: "title", width: 240 }], form: { fields: [{ propertyId: "title", required: true }] } };
  await assert.rejects(service.mutate("member", "db", [{ kind: "view", view }], 1), /denied/);
  await assert.rejects(service.mutate("admin", "db", [{ kind: "view", view: { ...view, columns: [{ propertyId: "title", width: 9000 }] } }], 1));
  await service.mutate("admin", "db", [{ kind: "view", view }], 1);
  await assert.rejects(service.submitForm("member", "db", "requests", "new", {}, 2));
  await assert.rejects(service.submitForm("member", "db", "requests", "new", { title: "Valid", amount: 99 }, 2));
  await service.submitForm("member", "db", "requests", "new", { title: "Valid" }, 2);
  assert.equal((await repository.read("db"))?.records.find(record => record.id === "new")?.values["title"], "Valid");
  await assert.rejects(service.submitForm("member", "db", "requests", "new", { title: "Duplicate" }, 3));
});
test("chart aggregates all authorized pages and never includes hidden records", async () => {
  const { service } = await setup();
  assert.deepEqual((await service.aggregate("member", "db", { groupPropertyId: "status", valuePropertyId: "amount", aggregate: "sum" })).groups, [{ label: "todo", value: 2, count: 1 }, { label: "done", value: 4, count: 1 }]);
  await assert.rejects(service.aggregate("member", "db", { groupPropertyId: "missing", aggregate: "count" }));
  await assert.rejects(service.aggregate("denied", "db", { groupPropertyId: "status", aggregate: "count" }));
});
test("chart uses one snapshot beyond the UI page and rejects numeric overflow", async () => {
  const repository = new InMemoryDatabaseRepository(); let reads = 0;
  const service = new DatabaseService({ read: async id => { reads++; return repository.read(id); }, write: (value, revision) => repository.write(value, revision) }, policy);
  await service.create("admin", { id: "large", title: "Large", properties: [{ id: "group", name: "Group", type: "text" }, { id: "value", name: "Value", type: "number" }], records: Array.from({ length: 620 }, (_, index) => ({ id: String(index), values: { group: "all", value: 1 } })) });
  reads = 0;
  assert.equal((await service.aggregate("member", "large", { groupPropertyId: "group", valuePropertyId: "value", aggregate: "sum" })).groups[0]?.value, 620);
  assert.equal(reads, 1);
  await service.mutate("admin", "large", [{ kind: "patch", recordId: "0", values: { value: Number.MAX_VALUE } }, { kind: "patch", recordId: "1", values: { value: Number.MAX_VALUE } }], 1);
  await assert.rejects(service.aggregate("admin", "large", { groupPropertyId: "group", valuePropertyId: "value", aggregate: "sum" }), /invalid-database-value/);
  assert.ok(Number.isFinite((await service.aggregate("admin", "large", { groupPropertyId: "group", valuePropertyId: "value", aggregate: "average" })).groups[0]?.value));
});
test("removing a property reconciles saved filters/columns/forms without invalid references", async () => {
  const { service, repository } = await setup();
  await service.mutate("admin", "db", [{ kind: "view", view: { id: "saved", name: "Saved", kind: "chart", chart: { groupPropertyId: "status", aggregate: "count" }, columns: [{ propertyId: "status", width: 180 }, { propertyId: "title", width: 180 }], query: { filter: { kind: "condition", propertyId: "status", operator: "equal", value: "todo" }, sort: [{ propertyId: "status", direction: "asc" }] }, form: { fields: [{ propertyId: "status", required: true }, { propertyId: "title", required: true }] } } }], 1);
  const current = (await repository.read("db"))!;
  await service.mutate("admin", "db", [{ kind: "properties", properties: current.properties.filter(property => property.id !== "status") }], 2);
  const next = (await repository.read("db"))!;
  assert.equal(next.records[0]?.values["status"], undefined);
  assert.equal(next.views?.[0]?.chart, undefined);
  assert.equal(next.views?.[0]?.query?.filter, undefined);
  assert.deepEqual(next.views?.[0]?.query?.sort, []);
  assert.deepEqual(next.views?.[0]?.columns?.map(column => column.propertyId), ["title"]);
  assert.deepEqual(next.views?.[0]?.form?.fields.map(field => field.propertyId), ["title"]);
});
test("date-range moves preserve duration and reject invalid dates", () => {
  const record = { id: "row", values: { start: "2026-10-16", end: "2026-10-19" } };
  assert.deepEqual(shiftRecordDates(record, "start", "end", "2026-10-18"), { start: "2026-10-18", end: "2026-10-21" });
  assert.deepEqual(shiftRecordDates(record, "start", undefined, "2026-10-18"), { start: "2026-10-18" });
  assert.throws(() => shiftRecordDates(record, "start", "end", "invalid"));
});
test("record document authorizes every operation and supports immutable history/restore", async () => {
  const { service } = await setup(), documents = new InMemoryDocumentRepository({ registry: articleRegistry }), pages = new RecordPageService(service, documents);
  const first = await pages.open("member", "db", "a", "vi"); assert.equal(first.revision, 0);
  await assert.rejects(pages.open("member", "db", "secret"));
  await assert.rejects(pages.save("denied", "db", "a", first.document, 0, "create"));
  assert.equal(await documents.getById(recordDocumentId("db", "a")), null);
  assert.deepEqual(await pages.save("member", "db", "a", first.document, 0, "create"), { ok: true, revision: 1 });
  assert.deepEqual(await pages.save("member", "db", "a", first.document, 0, "create"), { ok: true, revision: 1 });
  const edited = { ...first.document, blocks: [paragraph([text("Record body")])] };
  assert.deepEqual(await pages.save("member", "db", "a", edited, 1, "edit"), { ok: true, revision: 2 });
  assert.equal((await pages.save("member", "db", "a", first.document, 1, "stale")).ok, false);
  assert.equal((await pages.history("member", "db", "a")).length, 2);
  assert.equal((await pages.restore("member", "db", "a", 1, 2, "restore")).ok, true);
  assert.equal((await pages.history("member", "db", "a")).length, 3);
  assert.equal((await pages.revision("member", "db", "a", 2)).blocks[0]?.content?.[0]?.type, "text");
  await assert.rejects(pages.revision("member", "db", "secret", 1));
});
