import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocument, paragraph, text, createDefaultRegistry, createMigrationRegistry } from "../../document-core/src/index.js";
import { InMemoryDocumentRepository } from "../../storage-contracts/src/index.js";
import { ContentApplicationService, type AuditEvent } from "../src/index.js";

const registry = createDefaultRegistry();
const NOW = "2026-01-01T00:00:00.000Z";

function setup() {
  const audit: AuditEvent[] = [];
  const store = new InMemoryDocumentRepository({ registry, now: () => NOW });
  const svc = new ContentApplicationService({ store, registry, migrations: createMigrationRegistry(), audit: { record: (e) => audit.push(e) }, now: () => NOW });
  return { svc, store, audit };
}

function doc(id: string, body: string, attrs?: Record<string, unknown>) {
  return createDocument({ id, now: NOW, metadata: { createdAt: NOW, updatedAt: NOW, attributes: attrs }, blocks: [paragraph([text(body)], { id: "p" })] });
}

test("create → save → publish → public read (migrated) with audit trail", async () => {
  const { svc, audit } = setup();
  const created = await svc.createDraft({ slug: "privacy", locale: "en", kind: "ARTICLE", title: "Privacy", actor: "u1", document: doc("d1", "v1") });
  assert.equal(created.ok, true);

  const saved = await svc.saveDraft({ documentId: "d1", expectedRevision: 1, document: doc("d1", "v2"), idempotencyKey: "k1", actor: "u1" });
  assert.equal(saved.ok, true);

  await svc.publish({ documentId: "d1", revision: 2, actor: "u1" });
  const published = await svc.getPublished("privacy", "en");
  assert.equal(published.ok, true);
  if (published.ok) assert.equal(published.value?.revision.document.blocks[0]?.content?.[0]?.type, "text");

  assert.deepEqual(audit.map((a) => a.action), ["create", "save-draft", "publish"]);
});

test("legal document cannot be published without an effective date", async () => {
  const { svc } = setup();
  await svc.createDraft({ slug: "tos", locale: "en", kind: "LEGAL_POLICY", title: "ToS", actor: "u1", document: doc("d2", "legal") });
  const result = await svc.publish({ documentId: "d2", revision: 1, actor: "u1" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "missing-effective-date");

  // with an effective date it publishes
  const svc2 = setup();
  await svc2.svc.createDraft({ slug: "tos", locale: "en", kind: "LEGAL_POLICY", title: "ToS", actor: "u1", document: doc("d3", "legal", { effectiveDate: "2026-01-01" }) });
  const ok = await svc2.svc.publish({ documentId: "d3", revision: 1, actor: "u1" });
  assert.equal(ok.ok, true);
});

test("invalid documents are rejected at the boundary", async () => {
  const { svc } = setup();
  const bad = { ...doc("d4", "x"), format: "nope" } as never;
  const result = await svc.createDraft({ slug: "s", locale: "en", kind: "ARTICLE", title: "T", actor: "u1", document: bad });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "invalid-document");
});

test("editing an archived document is blocked", async () => {
  const { svc, store } = setup();
  await svc.createDraft({ slug: "old", locale: "en", kind: "ARTICLE", title: "Old", actor: "u1", document: doc("d5", "x") });
  await store.archive({ documentId: "d5", actor: "u1" });
  const result = await svc.saveDraft({ documentId: "d5", expectedRevision: 1, document: doc("d5", "y"), idempotencyKey: "k", actor: "u1" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "archived");
});

test("revision conflicts are application errors rather than nested success values", async () => {
  const { svc } = setup();
  await svc.createDraft({ slug: "conflict", locale: "en", kind: "ARTICLE", title: "Conflict", actor: "u1", document: doc("d6", "v1") });
  await svc.saveDraft({ documentId: "d6", expectedRevision: 1, document: doc("d6", "v2"), idempotencyKey: "first", actor: "u1" });
  const conflict = await svc.saveDraft({ documentId: "d6", expectedRevision: 1, document: doc("d6", "v3"), idempotencyKey: "second", actor: "u1" });
  assert.equal(conflict.ok, false);
  if (!conflict.ok) assert.equal(conflict.error.code, "revision-conflict");
});

test("published legacy documents migrate before current-schema validation", async () => {
  const store = new InMemoryDocumentRepository({ registry, now: () => NOW });
  const legacy = {
    ...doc("d7", "legacy"),
    schemaVersion: 0,
    blocks: [{
      id: "heading",
      type: "heading",
      version: 1,
      props: { level: 9 },
      content: [text("Legacy")],
    }],
  };
  await store.create({
    slug: "legacy",
    locale: "en",
    kind: "ARTICLE",
    title: "Legacy",
    actor: "u1",
    document: legacy,
  });
  await store.publish({ documentId: "d7", revision: 1, actor: "u1" });
  const migrations = createMigrationRegistry().registerDocumentMigration(0, 1, (document) => ({
    ...document,
    blocks: document.blocks.map((block) => ({
      ...block,
      props: block.type === "heading" ? { ...block.props, level: 1 } : block.props,
    })),
  }));
  const svc = new ContentApplicationService({ store, registry, migrations });
  const result = await svc.getPublished("legacy", "en");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value?.revision.document.schemaVersion, 1);
});
