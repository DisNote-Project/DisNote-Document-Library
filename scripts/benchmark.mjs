/**
 * Performance benchmark (guideline section 29.1). Run after building:
 *   node scripts/benchmark.mjs
 * Measures traversal, canonical serialization, checksum and plain-text
 * projection on a large document.
 */
import {
  createDocument,
  paragraph,
  text,
  collectBlockIds,
  canonicalJson,
  checksum,
  extractDocumentPlainText,
  createDefaultRegistry,
} from "../packages/document-core/dist/index.js";

const registry = createDefaultRegistry();

function large(n) {
  const blocks = Array.from({ length: n }, (_, i) => paragraph([text(`block ${i} — nội dung tiếng Việt`)], { id: `b${i}` }));
  return createDocument({ id: "bench", blocks });
}

function time(label, fn) {
  const t0 = process.hrtime.bigint();
  const out = fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`${label.padEnd(28)} ${ms.toFixed(2)} ms`);
  return out;
}

for (const n of [1000, 5000, 10000]) {
  console.log(`\n=== ${n} blocks ===`);
  const doc = large(n);
  time("collectBlockIds", () => collectBlockIds(doc));
  time("canonicalJson", () => canonicalJson(doc));
  time("checksum (sha256)", () => checksum(doc));
  time("extractDocumentPlainText", () => extractDocumentPlainText(doc, registry));
}
