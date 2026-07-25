import { test } from "node:test";
import { createDocument, paragraph, text, createDefaultRegistry } from "../../document-core/src/index.js";
import { InMemoryDocumentRepository } from "../../storage-contracts/src/index.js";
import { runDocumentRepositoryContract, type RepositoryHarness } from "../src/index.js";

const registry = createDefaultRegistry();
let clock = 0;

function makeHarness(): RepositoryHarness {
  const repo = new InMemoryDocumentRepository({ registry, now: () => `2026-01-01T00:00:${String(clock++ % 60).padStart(2, "0")}.000Z` });
  return {
    reader: repo,
    draftWriter: repo,
    publisher: repo,
    revisions: repo,
    makeDocument: (id, _slug, body) =>
      createDocument({ id, now: "2026-01-01T00:00:00.000Z", blocks: [paragraph([text(body)], { id: "p" })] }),
    async seed(input) {
      await repo.create({ slug: input.slug, locale: input.locale, kind: "ARTICLE", title: input.title, actor: "u1", document: input.document });
      return input.document.id;
    },
  };
}

// The reusable contract runs against the in-memory implementation.
runDocumentRepositoryContract(test, makeHarness);
