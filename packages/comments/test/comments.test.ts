import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocument, paragraph, text, removeBlock } from "../../document-core/src/index.js";
import { InMemoryCommentStore, InMemoryMentionProvider } from "../src/index.js";

const NOW = "2026-01-01T00:00:00.000Z";
const store = () => new InMemoryCommentStore({ now: () => NOW });

test("threads carry replies and resolve status", () => {
  const s = store();
  const t = s.createThread({ documentId: "d1", revisionBase: 1, anchor: { type: "block", blockId: "b1" }, author: "u1", body: "first" });
  s.addComment(t.id, "u2", "reply");
  s.setStatus(t.id, "resolved");
  const [thread] = s.listForDocument("d1");
  assert.equal(thread?.comments.length, 2);
  assert.equal(thread?.status, "resolved");
});

test("thread becomes orphaned (not deleted) when its block is removed", () => {
  const s = store();
  let doc = createDocument({ id: "d1", now: NOW, blocks: [paragraph([text("x")], { id: "b1" })] });
  s.createThread({ documentId: "d1", revisionBase: 1, anchor: { type: "block", blockId: "b1" }, author: "u1", body: "note" });
  s.reconcile(doc);
  assert.equal(s.listForDocument("d1")[0]?.orphaned, false);

  const removed = removeBlock(doc, "b1");
  assert.equal(removed.ok, true);
  if (removed.ok) doc = removed.document;
  s.reconcile(doc);
  const thread = s.listForDocument("d1")[0];
  assert.equal(thread?.orphaned, true, "orphaned");
  assert.ok(thread, "still present, not lost");
});

test("mention provider searches and resolves without a user service", async () => {
  const provider = new InMemoryMentionProvider([
    { entityType: "user", entityId: "u_1", label: "Mink", href: "/u/1" },
    { entityType: "channel", entityId: "c_1", label: "general" },
  ]);
  const hits = await provider.search("min", {});
  assert.equal(hits[0]?.entityId, "u_1");
  const resolved = await provider.resolve("user", "u_1");
  assert.equal(resolved?.href, "/u/1");
  assert.equal(await provider.resolve("user", "nope"), null);
});
