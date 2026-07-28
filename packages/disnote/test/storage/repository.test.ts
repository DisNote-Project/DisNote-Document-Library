import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocument, paragraph, text, createDefaultRegistry } from "../../src/core/index.js";
import { InMemoryDocumentRepository } from "../../src/storage/index.js";

const registry = createDefaultRegistry();
let clock = 0;
const now = () => `2026-01-01T00:00:${String(clock++).padStart(2, "0")}.000Z`;

function repo() {
  return new InMemoryDocumentRepository({ registry, now });
}

function doc(id: string, body: string) {
  return createDocument({ id, now: "2026-01-01T00:00:00.000Z", blocks: [paragraph([text(body)], { id: "p" })] });
}

test("create seeds revision 1 and a plain-text projection", async () => {
  const r = repo();
  await r.create({ slug: "privacy", locale: "en", kind: "LEGAL_POLICY", title: "Privacy", actor: "u1", document: doc("d1", "hello") });
  const rev = await r.getRevision("d1", 1);
  assert.equal(rev?.plainText, "hello");
  assert.match(rev!.checksum, /^[0-9a-f]{64}$/);
});

test("optimistic concurrency rejects a stale expectedRevision", async () => {
  const r = repo();
  await r.create({ slug: "s", locale: "en", kind: "ARTICLE", title: "A", actor: "u1", document: doc("d2", "v1") });
  const first = await r.saveDraft({ documentId: "d2", expectedRevision: 1, document: doc("d2", "v2"), idempotencyKey: "k1", actor: "u1" });
  assert.deepEqual(first, { ok: true, revision: 2 });
  const stale = await r.saveDraft({ documentId: "d2", expectedRevision: 1, document: doc("d2", "v3"), idempotencyKey: "k2", actor: "u1" });
  assert.equal(stale.ok, false);
  if (!stale.ok && stale.reason === "revision-conflict") assert.equal(stale.currentRevision, 2);
});

test("idempotency key returns the same revision without duplicating", async () => {
  const r = repo();
  await r.create({ slug: "s", locale: "en", kind: "ARTICLE", title: "A", actor: "u1", document: doc("d3", "v1") });
  const a = await r.saveDraft({ documentId: "d3", expectedRevision: 1, document: doc("d3", "v2"), idempotencyKey: "same", actor: "u1" });
  const b = await r.saveDraft({ documentId: "d3", expectedRevision: 1, document: doc("d3", "v2"), idempotencyKey: "same", actor: "u1" });
  assert.deepEqual(a, b);
  const revs = await r.listRevisions("d3");
  assert.equal(revs.length, 2);
});

test("published revision stays immutable while a new draft is written", async () => {
  const r = repo();
  await r.create({ slug: "policy", locale: "en", kind: "LEGAL_POLICY", title: "P", actor: "u1", document: doc("d4", "live") });
  await r.publish({ documentId: "d4", revision: 1, actor: "u1" });
  await r.saveDraft({ documentId: "d4", expectedRevision: 1, document: doc("d4", "edited"), idempotencyKey: "k", actor: "u1" });

  const published = await r.getPublishedBySlug({ slug: "policy", locale: "en" });
  assert.equal(published?.revision.plainText, "live", "landing still reads the published revision");

  await r.publish({ documentId: "d4", revision: 2, actor: "u1" });
  const updated = await r.getPublishedBySlug({ slug: "policy", locale: "en" });
  assert.equal(updated?.revision.plainText, "edited");
});

test("archived document is no longer served publicly", async () => {
  const r = repo();
  await r.create({ slug: "old", locale: "en", kind: "ARTICLE", title: "Old", actor: "u1", document: doc("d5", "x") });
  await r.publish({ documentId: "d5", revision: 1, actor: "u1" });
  await r.archive({ documentId: "d5", actor: "u1" });
  const published = await r.getPublishedBySlug({ slug: "old", locale: "en" });
  assert.equal(published, null);
});

test("idempotency keys are scoped to a document", async () => {
  const r = repo();
  await r.create({ slug: "a", locale: "en", kind: "ARTICLE", title: "A", actor: "u1", document: doc("idem-a", "v1") });
  await r.create({ slug: "b", locale: "en", kind: "ARTICLE", title: "B", actor: "u1", document: doc("idem-b", "v1") });

  const first = await r.saveDraft({
    documentId: "idem-a",
    expectedRevision: 1,
    document: doc("idem-a", "v2"),
    idempotencyKey: "same-client-key",
    actor: "u1",
  });
  const second = await r.saveDraft({
    documentId: "idem-b",
    expectedRevision: 1,
    document: doc("idem-b", "v2"),
    idempotencyKey: "same-client-key",
    actor: "u1",
  });
  assert.deepEqual(first, { ok: true, revision: 2 });
  assert.deepEqual(second, { ok: true, revision: 2 });
  assert.equal((await r.listRevisions("idem-b")).length, 2);
});

test("stored revisions are immutable from caller mutations", async () => {
  const r = repo();
  const source = doc("immutable", "original");
  await r.create({ slug: "immutable", locale: "en", kind: "ARTICLE", title: "Immutable", actor: "u1", document: source });
  source.blocks[0]!.content = [text("mutated source")];

  const firstRead = await r.getRevision("immutable", 1);
  assert.equal(firstRead?.plainText, "original");
  firstRead!.document.blocks[0]!.content = [text("mutated result")];
  const secondRead = await r.getRevision("immutable", 1);
  assert.equal(secondRead?.document.blocks[0]?.content?.[0]?.type === "text"
    ? secondRead.document.blocks[0].content[0].text
    : "", "original");
});

test("saveDraft rejects a mismatched document id", async () => {
  const r = repo();
  await r.create({ slug: "target", locale: "en", kind: "ARTICLE", title: "Target", actor: "u1", document: doc("target", "v1") });
  await assert.rejects(() => r.saveDraft({
    documentId: "target",
    expectedRevision: 1,
    document: doc("different", "v2"),
    idempotencyKey: "mismatch",
    actor: "u1",
  }), /does not match target/);
});
