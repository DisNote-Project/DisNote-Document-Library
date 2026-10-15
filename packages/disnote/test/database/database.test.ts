import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseService, InMemoryDatabaseRepository, DATABASE_ERRORS, evaluateFormula, type DatabasePolicy } from "../../src/database/index.js";

const policy: DatabasePolicy = {
  async assert(actor) { if (actor === "denied") throw new Error(DATABASE_ERRORS.DENIED); },
  async canReadRecord(actor, _id, record) { return actor === "admin" || record.id !== "hidden"; },
  async canWriteRecord(actor, _id, before, after) { return actor === "admin" || (before?.id !== "hidden" && after?.id !== "hidden"); },
};
function setup() { const repository = new InMemoryDatabaseRepository(); return { repository, service: new DatabaseService(repository, policy) }; }

test("typed records, computed sorting, filter, groups and pagination", async () => {
  const { service } = setup();
  await service.create("admin", { id: "db", title: "Tasks", properties: [
    { id: "title", name: "Title", type: "text" }, { id: "hours", name: "Hours", type: "number" },
    { id: "status", name: "Status", type: "select", options: ["todo", "done"] },
    { id: "cost", name: "Cost", type: "formula", formula: { kind: "operation", operator: "multiply", args: [{ kind: "property", propertyId: "hours" }, { kind: "literal", value: 10 }] } },
  ], records: [
    { id: "a", values: { title: "A", hours: 2, status: "todo" } },
    { id: "b", values: { title: "B", hours: 4, status: "done" } },
    { id: "hidden", values: { title: "Secret", hours: 100, status: "todo" } },
  ] });
  const result = await service.query("member", "db", { filter: { kind: "condition", propertyId: "cost", operator: "greater", value: 10 }, sort: [{ propertyId: "cost", direction: "desc" }], groupBy: "status", limit: 1 });
  assert.equal(result.total, 2);
  assert.equal(result.records[0]?.id, "b");
  assert.equal(result.records[0]?.values["cost"], 40);
  assert.equal(result.groups[0]?.key, "done");
  await assert.rejects(service.upsertRecord("admin", "db", { id: "bad", values: { hours: "wrong" } }, 1), /invalid-database-value/);
  const next = await service.upsertRecord("admin", "db", { id: "c", values: { hours: 3, status: "todo" } }, 1);
  assert.equal(next.revision, 2);
  await assert.rejects(service.deleteRecord("admin", "db", "a", 1), /revision-conflict/);
  await service.deleteRecord("admin", "db", "a", 2);
  assert.equal((await service.query("admin", "db")).records.some(r => r.id === "a"), false);
});

test("relation and rollup never reveal hidden record IDs or values", async () => {
  const { service } = setup();
  await service.create("admin", { id: "target", title: "Target", properties: [{ id: "amount", name: "Amount", type: "number" }], records: [{ id: "visible", values: { amount: 5 } }, { id: "hidden", values: { amount: 100 } }] });
  await service.create("admin", { id: "source", title: "Source", properties: [
    { id: "related", name: "Related", type: "relation", targetDatabaseId: "target" },
    { id: "total", name: "Total", type: "rollup", rollup: { relationId: "related", propertyId: "amount", aggregate: "sum" } },
  ], records: [{ id: "row", values: { related: ["visible", "hidden"] } }] });
  const result = await service.query("member", "source");
  assert.deepEqual(result.records[0]?.values["related"], ["visible"]);
  assert.equal(result.records[0]?.values["total"], 5);
  await assert.rejects(service.query("denied", "source"), /access-denied/);
  await assert.rejects(service.upsertRecord("member", "source", { id: "bad", values: { related: ["hidden"] } }, 1), /access-denied/);
});

test("formula cycles and invalid arithmetic fail without executing code", async () => {
  const { service } = setup();
  await service.create("admin", { id: "cycle", title: "Cycle", properties: [{ id: "self", name: "Self", type: "formula", formula: { kind: "property", propertyId: "self" } }], records: [{ id: "row", values: {} }] });
  await assert.rejects(service.query("admin", "cycle"), /computed-property-cycle/);
  await assert.rejects(evaluateFormula({ kind: "operation", operator: "divide", args: [{ kind: "literal", value: 1 }, { kind: "literal", value: 0 }] }, async () => null), /invalid-database-value/);
});

test("atomic compare-and-swap permits only one concurrent writer", async () => {
  const { service, repository } = setup();
  await service.create("admin", { id: "db", title: "Initial", properties: [], records: [] });
  const snapshot = (await repository.read("db"))!;
  const results = await Promise.allSettled([service.save("admin", { ...snapshot, title: "A" }), service.save("admin", { ...snapshot, title: "B" })]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal((await repository.read("db"))?.revision, 2);
});

test("mutation responses never expose hidden rows and row-level write policy applies to deletions", async () => {
  const { service } = setup();
  await service.create("admin", { id: "db", title: "Data", properties: [{ id: "text", name: "Text", type: "text" }], records: [{ id: "visible", values: { text: "Visible" } }, { id: "hidden", values: { text: "Secret" } }] });
  assert.deepEqual(await service.upsertRecord("member", "db", { id: "visible", values: { text: "Changed" } }, 1), { id: "db", revision: 2 });
  await assert.rejects(service.deleteRecord("member", "db", "hidden", 2), /access-denied/);
  await assert.rejects(service.upsertRecord("member", "db", { id: "hidden", values: { text: "Changed" } }, 2), /access-denied/);
});
