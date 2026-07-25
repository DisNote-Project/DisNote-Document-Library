import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  createDocument,
  appendBlock,
  insertBlock,
  updateBlock,
  removeBlock,
  moveBlock,
  wrapBlocks,
  paragraph,
  heading,
  callout,
  bulletListItem,
  text,
  validateDocument,
  canonicalJson,
  checksum,
  extractDocumentPlainText,
  extractHeadings,
  createDefaultRegistry,
  createMigrationRegistry,
  articlePreset,
  setIdGenerator,
} from "../src/index.js";
import type { DisNoteDocument } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(here, "fixtures", name), "utf8"));

// Deterministic IDs so serialization/checksum tests are stable.
let counter = 0;
setIdGenerator(() => `id${(counter++).toString().padStart(4, "0")}`);

const registry = createDefaultRegistry();

test("createDocument produces a valid V1 envelope", () => {
  const doc = createDocument({ metadata: { title: "T" }, now: "2026-01-01T00:00:00.000Z" });
  assert.equal(doc.format, "disnote-document");
  assert.equal(doc.schemaVersion, 1);
  const result = validateDocument(doc, { registry });
  assert.equal(result.ok, true);
});

test("validation rejects malformed documents with issues", () => {
  const result = validateDocument({ format: "wrong", blocks: "nope" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.issues.some((i) => i.path === "format"));
    assert.ok(result.issues.some((i) => i.path === "blocks"));
  }
});

test("validation flags duplicate block ids", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [paragraph([text("a")], { id: "dup" }), paragraph([text("b")], { id: "dup" })],
  });
  const result = validateDocument(doc);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((i) => i.code === "duplicate-id"));
});

test("validation detects unsafe URL schemes (XSS)", () => {
  const result = validateDocument(fixture("malicious-content.json"));
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((i) => i.code === "unsafe-url"));
});

test("unknown blocks are preserved by default, flagged only when strict", () => {
  const doc = fixture("unknown-block.json");
  const lenient = validateDocument(doc, { registry });
  assert.equal(lenient.ok, true, "unknown block preserved");
  const strict = validateDocument(doc, { registry, strictUnknownBlocks: true });
  assert.equal(strict.ok, false);
  if (!strict.ok) assert.ok(strict.issues.some((i) => i.code === "unknown-block"));
});

test("transformations are immutable", () => {
  const before = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [paragraph([text("hello")], { id: "p1" })],
  });
  const snapshot = JSON.parse(JSON.stringify(before));
  const result = updateBlock(before, "p1", { content: [text("changed")] });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.notEqual(result.document, before);
    assert.deepEqual(before, snapshot, "input document was not mutated");
  }
});

test("insert / move / remove / wrap round out the tree", () => {
  let doc = createDocument({ now: "2026-01-01T00:00:00.000Z" });
  doc = expectOk(appendBlock(doc, heading(1, [text("Title")], { id: "h" })));
  doc = expectOk(appendBlock(doc, paragraph([text("one")], { id: "p1" })));
  doc = expectOk(insertBlock(doc, { block: paragraph([text("zero")], { id: "p0" }), index: 1 }));
  assert.deepEqual(doc.blocks.map((b) => b.id), ["h", "p0", "p1"]);

  doc = expectOk(moveBlock(doc, "p1", { index: 0 }));
  assert.equal(doc.blocks[0]?.id, "p1");

  doc = expectOk(wrapBlocks(doc, ["h", "p0"], bulletListItem([], [])));
  const wrapper = doc.blocks.find((b) => b.children);
  assert.ok(wrapper && wrapper.children && wrapper.children.length === 2);

  const removed = removeBlock(doc, "p1");
  assert.equal(removed.ok, true);
});

test("removeBlock on a missing id returns a typed error", () => {
  const doc = createDocument({ now: "2026-01-01T00:00:00.000Z" });
  const result = removeBlock(doc, "nope");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "block-not-found");
});

test("transformations reject duplicate ids instead of creating invalid documents", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [paragraph([text("one")], { id: "p1" })],
  });
  const result = appendBlock(doc, paragraph([text("duplicate")], { id: "p1" }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "invalid-document");
});

test("validation rejects future schemas and content unsupported by void blocks", () => {
  const future = {
    ...createDocument({ now: "2026-01-01T00:00:00.000Z" }),
    schemaVersion: 999,
  };
  const futureResult = validateDocument(future, { registry });
  assert.equal(futureResult.ok, false);
  if (!futureResult.ok) {
    assert.ok(futureResult.issues.some((issue) => issue.code === "unsupported-future-version"));
  }

  const invalidDivider = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [{
      id: "divider",
      type: "divider",
      version: 1,
      props: {},
      content: [text("not allowed")],
    }],
  });
  const dividerResult = validateDocument(invalidDivider, { registry });
  assert.equal(dividerResult.ok, false);
  if (!dividerResult.ok) {
    assert.ok(dividerResult.issues.some((issue) => issue.code === "unsupported-content"));
  }
});

test("canonical serialization is deterministic and checksum stable", () => {
  const a = createDocument({ id: "doc_c", now: "2026-01-01T00:00:00.000Z", blocks: [paragraph([text("x")], { id: "p" })] });
  // Same document with keys inserted in a different order.
  const reordered = JSON.parse(JSON.stringify({ metadata: a.metadata, blocks: a.blocks, id: a.id, schemaVersion: a.schemaVersion, format: a.format }));
  assert.equal(canonicalJson(a as never), canonicalJson(reordered));
  assert.equal(checksum(a), checksum(reordered as DisNoteDocument));
  assert.match(checksum(a), /^[0-9a-f]{64}$/);
});

test("plain-text and heading projection", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [heading(1, [text("Hello")], { id: "h" }), paragraph([text("World")], { id: "p" })],
  });
  assert.equal(extractDocumentPlainText(doc, registry), "Hello\nWorld");
  const headings = extractHeadings(doc);
  assert.equal(headings.length, 1);
  assert.equal(headings[0]?.text, "Hello");
});

test("migration lifts a v0 document to v1 without mutating the source", () => {
  const source = fixture("old-document-v0.json") as DisNoteDocument;
  const snapshot = JSON.parse(JSON.stringify(source));
  const migrations = createMigrationRegistry().registerDocumentMigration(0, 1, (d) => ({
    ...d,
    metadata: { ...d.metadata, description: "migrated" },
  }));
  const result = migrations.migrate(source);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.document.schemaVersion, 1);
    assert.equal(result.document.metadata.description, "migrated");
    assert.deepEqual(source, snapshot, "source not mutated");
  }
});

test("block migration bumps a block version and reports it", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [callout([text("hi")], "info")],
  });
  const withV1 = { ...doc, blocks: doc.blocks.map((b) => ({ ...b, id: "c1" })) };
  const migrations = createMigrationRegistry().registerBlockMigration("callout", 1, 2, (b) => ({
    ...b,
    props: { ...b.props, intent: b.props.intent ?? "info" },
  }));
  const result = migrations.migrate(withV1);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.document.blocks[0]?.version, 2);
    assert.deepEqual(result.report.changedBlockIds, ["c1"]);
  }
});

test("preset carries a registry and depth policy", () => {
  assert.equal(articlePreset.registry.has("callout"), true);
  assert.equal(articlePreset.maxDepth, 4);
});

test("Vietnamese content survives serialization and plain-text", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [paragraph([text("Xin chào, tôi là DisNote — dấu tiếng Việt")], { id: "vi" })],
  });
  const json = canonicalJson(doc as never);
  const back = JSON.parse(json) as DisNoteDocument;
  assert.equal(extractDocumentPlainText(back, registry), "Xin chào, tôi là DisNote — dấu tiếng Việt");
});

function expectOk(result: { ok: true; document: DisNoteDocument } | { ok: false; error: unknown }): DisNoteDocument {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("expected ok");
  return result.document;
}
