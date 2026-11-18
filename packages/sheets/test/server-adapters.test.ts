import assert from "node:assert/strict";
import test from "node:test";

import {
  createWorkbook,
  MongoWorkbookStateRepository,
  PostgresWorkbookStateRepository,
  type SpreadsheetSqlExecutor,
  type WorkbookStoreState,
} from "../src/index.js";

const NOW = "2026-11-15T00:00:00.000Z";
const workbook = createWorkbook({ id: "adapter", title: "Adapter", now: NOW });
const state: WorkbookStoreState = { id: workbook.id, revision: 1, workbook, idempotency: {} };

test("Mongo adapter creates its unique index and performs revision CAS", async () => {
  let stored: Record<string, unknown> | null = null;
  const indexes: string[] = [];
  const repository = new MongoWorkbookStateRepository({
    createIndex: async (_keys, options) => { indexes.push(options?.name ?? ""); },
    findOne: async () => stored,
    insertOne: async (document) => { if (stored) throw Object.assign(new Error("duplicate"), { code: 11000 }); stored = structuredClone(document); },
    updateOne: async (filter, update) => {
      if (!stored || stored["revision"] !== filter["revision"]) return { matchedCount: 0 };
      stored = structuredClone((update["$set"] as Record<string, unknown>));
      return { matchedCount: 1 };
    },
  });
  await repository.initialize();
  assert.deepEqual(indexes, ["disnote_workbook_id"]);
  assert.equal(await repository.write(state, null), true);
  assert.equal(await repository.write({ ...state, revision: 2 }, 9), false);
  assert.equal(await repository.write({ ...state, revision: 2 }, 1), true);
  assert.equal((await repository.read(state.id))?.revision, 2);
});

test("Postgres adapter parameterizes values and validates table identifiers", async () => {
  const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  const sql: SpreadsheetSqlExecutor = { query: async (text, values) => { calls.push({ text, ...(values ? { values } : {}) }); return { rows: [], rowCount: text.startsWith("INSERT") || text.startsWith("UPDATE") ? 1 : 0 }; } };
  const repository = new PostgresWorkbookStateRepository(sql, "tenant_workbooks");
  await repository.initialize();
  assert.equal(await repository.write(state, null), true);
  assert.equal(await repository.write({ ...state, revision: 2 }, 1), true);
  assert.match(calls[0]!.text, /CREATE TABLE IF NOT EXISTS tenant_workbooks/u);
  assert.deepEqual(calls[1]!.values?.slice(0, 2), [state.id, 1]);
  assert.throws(() => new PostgresWorkbookStateRepository(sql, "bad;drop table"), /spreadsheet-invalid-table/u);
});
