import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import * as Y from "yjs";
import { MongoUpdateStore } from "../src/mongo-update-store.js";

const uri = process.env["DISNOTE_TEST_MONGO_URI"];

test(
  "Mongo update store survives compaction and a new store instance",
  { skip: uri ? false : "DISNOTE_TEST_MONGO_URI is not configured" },
  async () => {
    if (!uri) return;
    const client = new MongoClient(uri);
    await client.connect();
    try {
      const db = client.db(`disnote_collab_${randomUUID().replaceAll("-", "")}`);
      const store = new MongoUpdateStore(db, { compactThreshold: 2 });
      await store.initialize();
      const source = new Y.Doc();
      const text = source.getText("content");
      text.insert(0, "Hello");
      const first = Y.encodeStateAsUpdate(source);
      text.insert(5, " DisNote");
      const second = Y.encodeStateAsUpdate(source, Y.encodeStateVectorFromUpdate(first));
      await store.appendUpdate("doc-1", first);
      await store.appendUpdate("doc-1", second);

      const reloaded = new MongoUpdateStore(db, { compactThreshold: 2 });
      const target = new Y.Doc();
      for (const update of await reloaded.loadUpdates("doc-1")) {
        Y.applyUpdate(target, update);
      }
      assert.equal(target.getText("content").toString(), "Hello DisNote");
    } finally {
      await client.close();
    }
  },
);
