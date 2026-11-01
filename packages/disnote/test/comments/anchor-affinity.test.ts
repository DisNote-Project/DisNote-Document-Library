import { test } from "node:test";
import assert from "node:assert/strict";
import { remapCommentAnchors, type CommentThread } from "../../src/comments/index.js";
test("range anchors exclude text inserted directly before/after the quote and include interior edits", () => {
  const thread: CommentThread = { id: "thread", documentId: "doc", revisionBase: 1, status: "open", orphaned: false, comments: [], anchor: { type: "inline-range", blockId: "block", start: 0, end: 5 } };
  assert.deepEqual(remapCommentAnchors([thread], [{ blockId: "block", start: 0, deleteCount: 0, insertLength: 7 }])[0]?.anchor, { type: "inline-range", blockId: "block", start: 7, end: 12 });
  assert.deepEqual(remapCommentAnchors([thread], [{ blockId: "block", start: 5, deleteCount: 0, insertLength: 7 }])[0]?.anchor, thread.anchor);
  assert.deepEqual(remapCommentAnchors([thread], [{ blockId: "block", start: 2, deleteCount: 0, insertLength: 7 }])[0]?.anchor, { type: "inline-range", blockId: "block", start: 0, end: 12 });
});
