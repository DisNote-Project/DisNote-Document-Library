import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocument, createDefaultRegistry, paragraph, text } from "../../src/core/index.js";
import { RevisionDocumentRepository, type DocumentStateRepository, type DocumentStoreState } from "../../src/storage/index.js";
import { runDocumentRepositoryContract, type RepositoryHarness } from "../../src/testing/index.js";
function repository() {
  const states = new Map<string, DocumentStoreState>();
  const adapter: DocumentStateRepository = {
    async read(id) { return structuredClone(states.get(id) ?? null); },
    async findBySlug(query) { return structuredClone([...states.values()].find(state => state.stored.slug === query.slug && state.stored.locale === query.locale) ?? null); },
    async write(state, expectedRevision) {
      const previous = states.get(state.id);
      if (expectedRevision === null ? !!previous : previous?.revision !== expectedRevision) return false;
      if ([...states.values()].some(other => other.id !== state.id && other.stored.slug === state.stored.slug && other.stored.locale === state.stored.locale)) return false;
      states.set(state.id, structuredClone(state)); return true;
    },
  };
  return new RevisionDocumentRepository(adapter, createDefaultRegistry());
}
function harness(): RepositoryHarness {
  const repo = repository();
  return { reader: repo, draftWriter: repo, publisher: repo, revisions: repo,
    makeDocument: (id, _slug, body) => createDocument({ id, blocks: [paragraph([text(body)], { id: "p" })] }),
    async seed(input) { await repo.create({ ...input, kind: "ARTICLE", actor: "actor" }); return input.document.id; },
  };
}
runDocumentRepositoryContract((name, fn) => test(`CAS repository: ${name}`, fn), harness);
test("CAS repository retries pointer-only races and treats prototype-looking keys as data", async () => {
  const repo = repository(), document = createDocument({ id: "doc", blocks: [paragraph([text("Content")])] });
  await repo.create({ document, title: "Title", slug: "slug", locale: "en", kind: "ARTICLE", actor: "actor" });
  const [published, saved] = await Promise.all([repo.publish({ documentId: "doc", revision: 1, actor: "actor" }), repo.saveDraft({ documentId: "doc", document, expectedRevision: 1, idempotencyKey: "__proto__", actor: "actor" })]);
  assert.equal(published.stored.publishedRevision, 1); assert.deepEqual(saved, { ok: true, revision: 2 });
  assert.deepEqual(await repo.saveDraft({ documentId: "doc", document, expectedRevision: 1, idempotencyKey: "__proto__", actor: "actor" }), { ok: true, revision: 2 });
  assert.equal((await repo.getById("doc"))?.publishedRevision, 1);
});
test("CAS repository rejects competing slug creation and caller mutation cannot alter revisions", async () => {
  const repo = repository(), document = createDocument({ id: "doc", blocks: [] });
  const input = { document, title: "Title", slug: "slug", locale: "en", kind: "ARTICLE" as const, actor: "actor" };
  const results = await Promise.allSettled([repo.create(input), repo.create({ ...input, document: { ...document, id: "other" } })]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const read = await repo.getRevision("doc", 1); if (read) { read.document.metadata.title = "Mutated"; assert.notEqual((await repo.getRevision("doc", 1))?.document.metadata.title, "Mutated"); }
});
