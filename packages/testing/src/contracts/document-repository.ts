import type { DisNoteDocument } from "@disnote/document-core";

/** Minimal assertions so this package needs no Node type dependency. */
const assert = {
  equal(actual: unknown, expected: unknown, message?: string): void {
    if (actual !== expected) throw new Error(message ?? `expected ${String(expected)} but got ${String(actual)}`);
  },
  deepEqual(actual: unknown, expected: unknown, message?: string): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message ?? `expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    }
  },
};
import type {
  DocumentPublisher,
  DocumentReader,
  DraftWriter,
  RevisionReader,
} from "@disnote/storage-contracts";

/**
 * A repository implementation exposes these capabilities plus a seed helper so
 * the same contract can run against in-memory, Mongo or HTTP implementations.
 */
export interface RepositoryHarness {
  reader: DocumentReader;
  draftWriter: DraftWriter;
  publisher: DocumentPublisher;
  revisions: RevisionReader;
  /** Create a document at revision 1 and return its id. */
  seed(input: { slug: string; locale: string; title: string; document: DisNoteDocument }): Promise<string>;
  makeDocument(id: string, slug: string, body: string): DisNoteDocument;
}

export type RegisterTest = (name: string, fn: () => Promise<void> | void) => void;

/**
 * The DocumentRepository contract. Wire it to a runner (e.g. node:test `test`)
 * and a harness factory. Every implementation must pass identically.
 */
export function runDocumentRepositoryContract(
  register: RegisterTest,
  makeHarness: () => RepositoryHarness | Promise<RepositoryHarness>,
): void {
  register("getById returns a seeded document", async () => {
    const h = await makeHarness();
    const id = await h.seed({ slug: "s1", locale: "en", title: "T", document: h.makeDocument("d", "s1", "hi") });
    const stored = await h.reader.getById(id);
    assert.equal(stored?.currentRevision, 1);
  });

  register("saveDraft bumps the revision", async () => {
    const h = await makeHarness();
    const id = await h.seed({ slug: "s2", locale: "en", title: "T", document: h.makeDocument("d", "s2", "v1") });
    const result = await h.draftWriter.saveDraft({
      documentId: id,
      expectedRevision: 1,
      document: h.makeDocument(id, "s2", "v2"),
      idempotencyKey: "k1",
      actor: "u1",
    });
    assert.deepEqual(result, { ok: true, revision: 2 });
  });

  register("saveDraft rejects a stale expectedRevision", async () => {
    const h = await makeHarness();
    const id = await h.seed({ slug: "s3", locale: "en", title: "T", document: h.makeDocument("d", "s3", "v1") });
    await h.draftWriter.saveDraft({ documentId: id, expectedRevision: 1, document: h.makeDocument(id, "s3", "v2"), idempotencyKey: "k1", actor: "u1" });
    const stale = await h.draftWriter.saveDraft({ documentId: id, expectedRevision: 1, document: h.makeDocument(id, "s3", "v3"), idempotencyKey: "k2", actor: "u1" });
    assert.equal(stale.ok, false);
  });

  register("idempotency key does not duplicate a revision", async () => {
    const h = await makeHarness();
    const id = await h.seed({ slug: "s4", locale: "en", title: "T", document: h.makeDocument("d", "s4", "v1") });
    const a = await h.draftWriter.saveDraft({ documentId: id, expectedRevision: 1, document: h.makeDocument(id, "s4", "v2"), idempotencyKey: "same", actor: "u1" });
    const b = await h.draftWriter.saveDraft({ documentId: id, expectedRevision: 1, document: h.makeDocument(id, "s4", "v2"), idempotencyKey: "same", actor: "u1" });
    assert.deepEqual(a, b);
    const list = await h.revisions.listRevisions(id);
    assert.equal(list.length, 2);
  });

  register("published revision is immutable while a new draft is written", async () => {
    const h = await makeHarness();
    const id = await h.seed({ slug: "policy", locale: "en", title: "P", document: h.makeDocument("d", "policy", "live") });
    await h.publisher.publish({ documentId: id, revision: 1, actor: "u1" });
    await h.draftWriter.saveDraft({ documentId: id, expectedRevision: 1, document: h.makeDocument(id, "policy", "edited"), idempotencyKey: "k", actor: "u1" });
    const published = await h.reader.getPublishedBySlug({ slug: "policy", locale: "en" });
    assert.equal(published?.revision.plainText, "live");
  });

  register("archived document is not served publicly", async () => {
    const h = await makeHarness();
    const id = await h.seed({ slug: "old", locale: "en", title: "O", document: h.makeDocument("d", "old", "x") });
    await h.publisher.publish({ documentId: id, revision: 1, actor: "u1" });
    await h.publisher.archive({ documentId: id, actor: "u1" });
    assert.equal(await h.reader.getPublishedBySlug({ slug: "old", locale: "en" }), null);
  });
}
