import test from "node:test";
import assert from "node:assert/strict";

import { MongoDocumentStateRepository, type MongoDocumentStateCollection } from "../../src/persistence/mongodb.js";
import { PostgresDocumentStateRepository, type SqlExecutor, type SqlQueryResult } from "../../src/persistence/postgres.js";
import type { DocumentStoreState } from "../../src/storage/revision-repository.js";

function state(id: string, revision: number, slug = id): DocumentStoreState {
  const now = "2026-11-15T00:00:00.000Z";
  return {
    id,
    revision,
    stored: {
      id,
      slug,
      locale: "en",
      kind: "ARTICLE",
      title: id,
      status: "draft",
      currentRevision: 1,
      schemaVersion: 1,
      createdBy: "actor",
      createdAt: now,
      updatedAt: now,
    },
    revisions: [],
    idempotency: {},
  };
}

class MemoryMongoCollection implements MongoDocumentStateCollection {
  readonly records = new Map<string, Record<string, unknown>>();
  readonly indexes: Record<string, 1 | -1>[] = [];

  async createIndex(keys: Record<string, 1 | -1>): Promise<string> {
    this.indexes.push(keys);
    return "ok";
  }

  async findOne(filter: Record<string, unknown>): Promise<unknown | null> {
    return [...this.records.values()].find((item) =>
      Object.entries(filter).every(([key, value]) => item[key] === value)) ?? null;
  }

  async insertOne(document: Record<string, unknown>): Promise<unknown> {
    const id = String(document["id"]);
    if (this.records.has(id)) throw Object.assign(new Error("duplicate"), { code: 11000 });
    this.records.set(id, structuredClone(document));
    return { acknowledged: true };
  }

  async updateOne(filter: Record<string, unknown>, update: Record<string, unknown>) {
    const current = await this.findOne(filter) as Record<string, unknown> | null;
    if (!current) return { matchedCount: 0 };
    const next = (update["$set"] ?? {}) as Record<string, unknown>;
    this.records.set(String(current["id"]), structuredClone(next));
    return { matchedCount: 1 };
  }
}

test("Mongo state adapter initializes indexes and enforces revision CAS", async () => {
  const collection = new MemoryMongoCollection();
  const repository = new MongoDocumentStateRepository(collection);
  await repository.initialize();
  assert.equal(collection.indexes.length, 2);
  assert.equal(await repository.write(state("doc", 1), null), true);
  assert.equal(await repository.write(state("doc", 1), null), false);
  assert.equal(await repository.write(state("doc", 2), 9), false);
  assert.equal(await repository.write(state("doc", 2), 1), true);
  assert.equal((await repository.read("doc"))?.revision, 2);
  assert.equal((await repository.findBySlug({ slug: "doc", locale: "en" }))?.id, "doc");
});

class MemorySqlExecutor implements SqlExecutor {
  readonly records = new Map<string, DocumentStoreState>();
  readonly statements: string[] = [];

  async query<Row = Record<string, unknown>>(text: string, values: readonly unknown[] = []): Promise<SqlQueryResult<Row>> {
    this.statements.push(text);
    if (text.startsWith("CREATE")) return { rows: [], rowCount: null };
    if (text.startsWith("SELECT") && text.includes("slug =")) {
      const found = [...this.records.values()].find((item) => item.stored.slug === values[0] && item.stored.locale === values[1]);
      return { rows: found ? [{ state: structuredClone(found) } as Row] : [], rowCount: found ? 1 : 0 };
    }
    if (text.startsWith("SELECT")) {
      const found = this.records.get(String(values[0]));
      return { rows: found ? [{ state: structuredClone(found) } as Row] : [], rowCount: found ? 1 : 0 };
    }
    const next = JSON.parse(String(values[4])) as DocumentStoreState;
    if (text.startsWith("INSERT")) {
      if (this.records.has(next.id)) return { rows: [], rowCount: 0 };
      this.records.set(next.id, next);
      return { rows: [], rowCount: 1 };
    }
    const current = this.records.get(next.id);
    if (!current || current.revision !== values[5]) return { rows: [], rowCount: 0 };
    this.records.set(next.id, next);
    return { rows: [], rowCount: 1 };
  }
}

test("Postgres state adapter creates schema and exposes identical CAS semantics", async () => {
  const sql = new MemorySqlExecutor();
  const repository = new PostgresDocumentStateRepository(sql);
  await repository.initialize();
  assert.equal(sql.statements.length, 2);
  assert.equal(await repository.write(state("doc", 1, "hello"), null), true);
  assert.equal(await repository.write(state("doc", 1, "hello"), null), false);
  assert.equal(await repository.write(state("doc", 2, "hello"), 7), false);
  assert.equal(await repository.write(state("doc", 2, "hello"), 1), true);
  assert.equal((await repository.read("doc"))?.revision, 2);
  assert.equal((await repository.findBySlug({ slug: "hello", locale: "en" }))?.id, "doc");
});

test("Postgres adapter rejects unsafe table identifiers", () => {
  assert.throws(() => new PostgresDocumentStateRepository(new MemorySqlExecutor(), "docs; DROP TABLE docs"));
});
