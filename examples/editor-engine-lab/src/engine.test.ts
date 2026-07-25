import { test } from "node:test";
import assert from "node:assert/strict";
import { EditorEngine } from "./engine.js";

test("insert, split, set heading, merge and undo/redo", () => {
  const e = new EditorEngine();
  e.dispatch({ kind: "insertText", text: "Hello world" });
  assert.equal(e.text(), "Hello world");

  // split after "Hello "
  e.setSelection({ blockId: e.getState().blocks[0]!.id, offset: 6 });
  e.dispatch({ kind: "splitBlock" });
  assert.equal(e.getState().blocks.length, 2);
  assert.equal(e.text(), "Hello \nworld");

  // make the first block a heading
  e.setSelection({ blockId: e.getState().blocks[0]!.id, offset: 0 });
  e.dispatch({ kind: "setType", type: "heading" });
  assert.match(e.text(), /^# Hello/);

  // merge the second block back into the first
  e.setSelection({ blockId: e.getState().blocks[1]!.id, offset: 0 });
  e.dispatch({ kind: "mergeBackward" });
  assert.equal(e.getState().blocks.length, 1);
  assert.equal(e.text(), "# Hello world");

  // undo the merge, then redo it
  assert.equal(e.undo(), true);
  assert.equal(e.getState().blocks.length, 2);
  assert.equal(e.redo(), true);
  assert.equal(e.getState().blocks.length, 1);

  // transaction log recorded every mutating step
  assert.deepEqual(
    e.log.map((t) => t.kind),
    ["insertText", "splitBlock", "setType", "mergeBackward"],
  );
});
