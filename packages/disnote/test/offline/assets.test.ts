import { test } from "node:test";
import assert from "node:assert/strict";
import { OfflineAssetCache, type OfflineAsset, type OfflineAssetStore } from "../../src/offline/index.js";
test("offline assets are reused without network, object URLs are revoked and logout clears persistence", async () => {
  const states = new Map<string, OfflineAsset>(); let downloads = 0; const revoked: string[] = [];
  const store: OfflineAssetStore = { async read(id) { return states.get(id) ?? null; }, async write(asset) { if (states.has(asset.id)) return false; states.set(asset.id, asset); return true; }, async clear() { states.clear(); } };
  const cache = new OfflineAssetCache(store, { async load() { downloads++; return new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }); } }, () => "blob:cached", url => revoked.push(url));
  await cache.prepare(["image", "image"]); assert.equal(downloads, 1); assert.equal(cache.resolve("image"), "blob:cached");
  cache.release(); assert.deepEqual(revoked, ["blob:cached"]);
  const reopened = new OfflineAssetCache(store, { async load() { throw new Error("offline"); } }, () => "blob:reopened", url => revoked.push(url));
  await reopened.prepare(["image"]); assert.equal(reopened.resolve("image"), "blob:reopened");
  await reopened.clear(); assert.equal(states.size, 0); assert.equal(reopened.resolve("image"), undefined);
});
test("offline asset cache rejects active HTML and mismatched declared MIME", async () => {
  const store: OfflineAssetStore = { async read() { return null; }, async write() { throw new Error("must-not-persist"); }, async clear() {} };
  const html = new OfflineAssetCache(store, { async load() { return new Blob(["<script>evil()</script>"], { type: "text/html" }); } });
  await assert.rejects(html.prepare(["html"]), /invalid-offline-asset/);
  const mismatch = new OfflineAssetCache(store, { async load() { return new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/jpeg" }); } });
  await assert.rejects(mismatch.prepare(["image"]), /invalid-offline-asset/);
});
