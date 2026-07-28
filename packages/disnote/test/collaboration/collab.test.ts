import { test } from "node:test";
import assert from "node:assert/strict";
import * as Y from "yjs";
import { createDocument, paragraph, text, createDefaultRegistry } from "../../src/core/index.js";
import { InMemoryUpdateStore, seedYDoc, snapshotFromYDoc, snapshotToRevision } from "../../src/collaboration/index.js";

const registry = createDefaultRegistry();
const NOW = "2026-01-01T00:00:00.000Z";

test("update store appends and compacts at the threshold", async () => {
  const store = new InMemoryUpdateStore({ now: () => NOW, compactThreshold: 3 });
  const source = new Y.Doc();
  const updates: Uint8Array[] = [];
  source.on("update", (update: Uint8Array) => updates.push(update));
  source.getText("content").insert(0, "A");
  source.getText("content").insert(1, "B");
  source.getText("content").insert(2, "C");

  await store.appendUpdate("d1", updates[0]!);
  await store.appendUpdate("d1", updates[1]!);
  assert.equal(store.updateCount("d1"), 2);
  assert.equal(store.hasSnapshot("d1"), false);
  await store.appendUpdate("d1", updates[2]!); // triggers compaction
  assert.equal(store.hasSnapshot("d1"), true);
  assert.equal(store.updateCount("d1"), 0);
  const loaded = await store.loadUpdates("d1");
  assert.equal(loaded.length, 1); // just the compacted snapshot
  assert.deepEqual(
    [...Y.encodeStateVectorFromUpdate(loaded[0]!)],
    [...Y.encodeStateVector(source)],
  );

  // Returned bytes are copies; a caller cannot corrupt the stored snapshot.
  loaded[0]![0] = loaded[0]![0]! ^ 0xff;
  const restored = new Y.Doc();
  Y.applyUpdate(restored, (await store.loadUpdates("d1"))[0]!);
  assert.equal(restored.getText("content").toString(), "ABC");
});

test("snapshot converts to an immutable, validated revision (no presence)", () => {
  const doc = createDocument({ id: "d1", now: NOW, blocks: [paragraph([text("collab")], { id: "p" })] });
  const result = snapshotToRevision(doc, registry);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.revision.plainText, "collab");
    assert.match(result.revision.checksum, /^[0-9a-f]{64}$/);
    assert.equal(result.revision.source, "editor");
  }
});

test("invalid snapshot is rejected before becoming a revision", () => {
  const bad = { format: "nope" } as never;
  const result = snapshotToRevision(bad, registry);
  assert.equal(result.ok, false);
});

test("Yjs binding keeps nested text collaborative and snapshots without data loss", () => {
  const source = createDocument({
    id: "d_yjs",
    now: NOW,
    blocks: [paragraph([text("Hello")], { id: "p" })],
  });
  const ydoc = new Y.Doc();
  seedYDoc(ydoc, source);

  const block = ydoc.getArray<Y.Map<unknown>>("blocks").get(0)!;
  const content = block.get("content") as Y.Array<Y.Map<unknown>>;
  const collaborativeText = content.get(0)!.get("text") as Y.Text;
  collaborativeText.insert(collaborativeText.length, " DisNote");

  const snapshot = snapshotFromYDoc(ydoc, {
    format: source.format,
    schemaVersion: source.schemaVersion,
    id: source.id,
    metadata: source.metadata,
  });
  assert.equal(snapshot.blocks[0]?.content?.[0]?.type, "text");
  assert.equal(
    snapshot.blocks[0]?.content?.[0]?.type === "text"
      ? snapshot.blocks[0].content[0].text
      : "",
    "Hello DisNote",
  );
});
