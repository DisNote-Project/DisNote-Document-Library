import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocument, paragraph, text } from "../../src/core/index.js";
import { selectionCommentAnchor } from "../../src/editor/react/selection-anchor.js";
test("selection anchors use canonical UTF-16 text offsets and bound non-text/cross-block selections", () => {
  const content = "Hello 😀 world", document = createDocument({ blocks: [paragraph([text(content)], { id: "block" })] });
  const position = { depth: 1, start: () => 1, node: () => ({ attrs: { id: "block" }, child: () => ({ textContent: content }) }) };
  const state = { selection: { from: 8, to: 10, $from: position, $to: position }, doc: { textBetween: (from: number, to: number) => content.slice(from - 2, to - 2) } };
  assert.deepEqual(selectionCommentAnchor(state, document), { type: "inline-range", blockId: "block", start: 6, end: 8 });
  assert.deepEqual(selectionCommentAnchor({ ...state, selection: { ...state.selection, $to: { ...position, node: () => ({ attrs: { id: "other" }, child: () => ({ textContent: "other" }) }) } } }, document), { type: "block", blockId: "block" });
  assert.deepEqual(selectionCommentAnchor({ ...state, selection: { ...state.selection, to: 8 } }, document), { type: "block", blockId: "block" });
});
