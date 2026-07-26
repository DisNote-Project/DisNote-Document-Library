import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDocument,
  paragraph,
  heading,
  bulletListItem,
  text,
  getBlocksInRange,
  deleteBlocksInRange,
  changeBlocksTypeInRange,
} from "../../src/core/index.js";

test("selection engine getBlocksInRange returns all blocks between anchor and focus", () => {
  const b1 = paragraph([text("one")]);
  b1.id = "b1";
  const b2 = heading(1, [text("two")]);
  b2.id = "b2";
  const b3 = bulletListItem([text("three")]);
  b3.id = "b3";
  
  const doc = createDocument({
    blocks: [b1, b2, b3]
  });

  const selected = getBlocksInRange(doc, { anchorBlockId: "b1", focusBlockId: "b3" });
  assert.equal(selected.length, 3);
  assert.deepEqual(selected.map(b => b.id), ["b1", "b2", "b3"]);

  const selectedRev = getBlocksInRange(doc, { anchorBlockId: "b3", focusBlockId: "b1" });
  assert.equal(selectedRev.length, 3);
  assert.deepEqual(selectedRev.map(b => b.id), ["b1", "b2", "b3"]);
  
  const selectedSingle = getBlocksInRange(doc, { anchorBlockId: "b2", focusBlockId: "b2" });
  assert.equal(selectedSingle.length, 1);
  assert.deepEqual(selectedSingle.map(b => b.id), ["b2"]);
});

test("selection engine deleteBlocksInRange removes blocks in range", () => {
  const b1 = paragraph([text("one")]);
  b1.id = "b1";
  const b2 = heading(1, [text("two")]);
  b2.id = "b2";
  const b3 = bulletListItem([text("three")]);
  b3.id = "b3";

  const doc = createDocument({
    blocks: [b1, b2, b3]
  });

  const nextDoc = deleteBlocksInRange(doc, { anchorBlockId: "b2", focusBlockId: "b3" });
  assert.equal(nextDoc.blocks.length, 1);
  assert.equal(nextDoc.blocks[0]!.id, "b1");
});

test("selection engine changeBlocksTypeInRange updates blocks in range", () => {
  const b1 = paragraph([text("one")]);
  b1.id = "b1";
  const b2 = heading(1, [text("two")]);
  b2.id = "b2";
  const b3 = bulletListItem([text("three")]);
  b3.id = "b3";

  const doc = createDocument({
    blocks: [b1, b2, b3]
  });

  const nextDoc = changeBlocksTypeInRange(doc, { anchorBlockId: "b1", focusBlockId: "b2" }, "quote");
  assert.equal(nextDoc.blocks[0]!.type, "quote");
  assert.equal(nextDoc.blocks[1]!.type, "quote");
  assert.equal(nextDoc.blocks[2]!.type, "bulletListItem");
});
