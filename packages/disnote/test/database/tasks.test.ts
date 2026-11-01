import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseService, InMemoryDatabaseRepository, type DatabaseSnapshot, type DatabasePolicy } from "../../src/database/index.js";
const definition: Omit<DatabaseSnapshot, "revision"> = {
  id: "tasks", title: "Tasks", properties: [{ id: "start", name: "Start", type: "date" }, { id: "end", name: "End", type: "date" }],
  records: [{ id: "a", values: { start: "2026-10-17", end: "2026-10-18" } }, { id: "b", values: { start: "2026-10-17", end: "2026-10-19" } }, { id: "c", values: { start: "2026-10-17", end: "2026-10-17" } }],
};
const policy: DatabasePolicy = { assert: async () => undefined, canReadRecord: async (actor, _db, record) => actor !== "limited" || record.id !== "c", canWriteRecord: async (actor, _db, before, after) => actor !== "limited" || (before?.id !== "c" && after?.id !== "c") };
test("dependencies and parent cycles are rejected atomically, hidden references are redacted", async () => {
  const repository = new InMemoryDatabaseRepository(), service = new DatabaseService(repository, policy);
  await service.create("owner", definition);
  await service.mutate("owner", "tasks", [{ kind: "task", recordId: "a", parentId: "c", addDependencies: ["c"] }], 1);
  const limited = await service.query("limited", "tasks");
  assert.equal(limited.total, 2); assert.equal(limited.records[0]?.parentId, undefined); assert.deepEqual(limited.records[0]?.dependencies, []);
  assert.equal((await service.record("limited", "tasks", "a")).record.parentId, undefined);
  await assert.rejects(service.mutate("owner", "tasks", [{ kind: "task", recordId: "c", addDependencies: ["a"] }], 2), /cycle/);
  await assert.rejects(service.mutate("owner", "tasks", [{ kind: "task", recordId: "c", parentId: "a" }], 2), /cycle/);
  await assert.rejects(service.mutate("limited", "tasks", [{ kind: "task", recordId: "b", addDependencies: ["c"] }], 2), /denied/);
  assert.equal((await repository.read("tasks"))?.revision, 2);
  await service.mutate("limited", "tasks", [{ kind: "task", recordId: "a", addDependencies: ["b"] }], 2);
  assert.deepEqual((await repository.read("tasks"))?.records[0]?.dependencies, ["c", "b"]);
});
test("forward rescheduling retains duration and authorizes every dependent in one CAS", async () => {
  const repository = new InMemoryDatabaseRepository(), service = new DatabaseService(repository, policy);
  await service.create("owner", definition);
  await service.mutate("owner", "tasks", [{ kind: "task", recordId: "b", addDependencies: ["a"] }, { kind: "task", recordId: "c", addDependencies: ["b"] }, { kind: "schedule", schedule: { startPropertyId: "start", endPropertyId: "end", autoShift: true } }], 1);
  const snapshot = await repository.read("tasks");
  assert.deepEqual(snapshot?.records[1]?.values, { start: "2026-10-19", end: "2026-10-21" });
  assert.equal(snapshot?.records[2]?.values["start"], "2026-10-22");
  await assert.rejects(service.mutate("limited", "tasks", [{ kind: "patch", recordId: "a", values: { start: "2026-10-25", end: "2026-10-26" } }], 2), /denied/);
  assert.equal((await repository.read("tasks"))?.revision, 2);
  await service.mutate("owner", "tasks", [{ kind: "patch", recordId: "a", values: { start: "2026-10-25", end: "2026-10-26" } }], 2);
  assert.deepEqual((await repository.read("tasks"))?.records[1]?.values, { start: "2026-10-27", end: "2026-10-29" });
  assert.equal((await repository.read("tasks"))?.records[2]?.values["start"], "2026-10-30");
  await service.deleteRecord("owner", "tasks", "b", 3);
  assert.deepEqual((await repository.read("tasks"))?.records.find(record => record.id === "c")?.dependencies, []);
});
test("task graph handles a long chain without recursive stack exhaustion", async () => {
  const service = new DatabaseService(new InMemoryDatabaseRepository(), policy);
  await service.create("owner", { ...definition, records: Array.from({ length: 3000 }, (_, at) => ({ id: String(at), ...(at ? { parentId: String(at - 1), dependencies: [String(at - 1)] } : {}), values: {} })) });
  assert.equal((await service.query("owner", "tasks", { limit: 1 })).total, 3000);
});
