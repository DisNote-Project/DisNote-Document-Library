import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDocument,
  paragraph,
  text,
  updateBlock,
  collectBlockIds,
  canonicalJson,
  checksum,
  extractDocumentPlainText,
  createDefaultRegistry,
} from "../src/index.js";

const registry = createDefaultRegistry();

function largeDocument(n: number) {
  const blocks = Array.from({ length: n }, (_, i) => paragraph([text(`block ${i} — nội dung`)], { id: `b${i}` }));
  return createDocument({ id: "large", now: "2026-01-01T00:00:00.000Z", blocks });
}

test("1,000-block document: traversal, serialization and checksum stay within budget", () => {
  const doc = largeDocument(1000);
  const t0 = process.hrtime.bigint();

  const ids = collectBlockIds(doc);
  assert.equal(ids.length, 1000);

  const json = canonicalJson(doc as never);
  assert.ok(json.length > 0);

  const sum = checksum(doc);
  assert.match(sum, /^[0-9a-f]{64}$/);

  const plain = extractDocumentPlainText(doc, registry);
  assert.equal(plain.split("\n").length, 1000);

  const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
  // Generous budget; guards against accidental O(n^2) regressions.
  assert.ok(elapsedMs < 2000, `processing took ${elapsedMs.toFixed(0)}ms`);
});

test("updating one block does not mutate the original large document", () => {
  const doc = largeDocument(500);
  const snapshotChecksum = checksum(doc);
  const result = updateBlock(doc, "b250", { content: [text("changed")] });
  assert.equal(result.ok, true);
  // Original checksum unchanged → no mutation.
  assert.equal(checksum(doc), snapshotChecksum);
});
