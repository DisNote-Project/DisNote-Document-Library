import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDocument,
  heading,
  paragraph,
  image,
  text,
  mention,
  reference,
  createDefaultRegistry,
} from "../../src/core/index.js";
import {
  buildSearchProjection,
  validateOperations,
  applyOperations,
  previewDiff,
  type AIDocumentOperation,
} from "../../src/search-ai/index.js";

const registry = createDefaultRegistry();
const NOW = "2026-01-01T00:00:00.000Z";

function doc() {
  return createDocument({
    id: "d1",
    now: NOW,
    metadata: { title: "Doc", locale: "vi", createdAt: NOW, updatedAt: NOW },
    blocks: [
      heading(1, [text("Title")], { id: "h" }),
      paragraph([text("hi "), mention("user", "u_1", "Mink"), reference("task", "t_1", "Ship")], { id: "p" }),
      image("asset_9", "pic", {}),
    ],
  });
}

test("search projection is built from the registry, not rendered output", () => {
  const proj = buildSearchProjection(doc(), registry, 3);
  assert.equal(proj.title, "Doc");
  assert.equal(proj.locale, "vi");
  assert.deepEqual(proj.headings, ["Title"]);
  assert.ok(proj.plainText.includes("Title"));
  assert.equal(proj.references.length, 2);
  assert.deepEqual(proj.assets, ["asset_9"]);
});

test("AI operations validate against existing block ids", () => {
  const ops: AIDocumentOperation[] = [
    { kind: "update", blockId: "missing", patch: { content: [text("x")] } },
    { kind: "insert", block: paragraph([text("new")], { id: "h" }) },
  ];
  const issues = validateOperations(doc(), ops);
  assert.ok(issues.some((i) => i.code === "block-not-found"));
  assert.ok(issues.some((i) => i.code === "duplicate-id"));
});

test("apply → preview shows a block-level diff and aborts on failure", () => {
  const before = doc();
  const good: AIDocumentOperation[] = [
    { kind: "update", blockId: "p", patch: { content: [text("edited")] } },
    { kind: "insert", block: paragraph([text("added")], { id: "new1" }) },
    { kind: "remove", blockId: "h" },
  ];
  const result = applyOperations(before, good);
  assert.equal(result.ok, true);
  if (result.ok) {
    const diff = previewDiff(before, result.document);
    assert.ok(diff.some((d) => d.blockId === "new1" && d.change === "added"));
    assert.ok(diff.some((d) => d.blockId === "h" && d.change === "removed"));
    assert.ok(diff.some((d) => d.blockId === "p" && d.change === "changed"));
  }

  const bad = applyOperations(before, [{ kind: "remove", blockId: "nope" }]);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.failedIndex, 0);
});
