import { test } from "node:test";
import assert from "node:assert/strict";
import { createCollaborationToken, verifyCollaborationToken } from "../src/auth.js";
import { CollaborationMetrics } from "../src/metrics.js";

test("collaboration token is document-scoped and expires", () => {
  const secret = "test-secret";
  const token = createCollaborationToken(
    { sub: "user-1", documents: ["doc-1"], exp: 200 },
    secret,
  );
  assert.equal(verifyCollaborationToken(token, "doc-1", secret, 100)?.sub, "user-1");
  assert.equal(verifyCollaborationToken(token, "doc-2", secret, 100), null);
  assert.equal(verifyCollaborationToken(token, "doc-1", secret, 201), null);
  assert.equal(verifyCollaborationToken(`${token}x`, "doc-1", secret, 100), null);
});

test("collaboration metrics expose counters and a live gauge", () => {
  const metrics = new CollaborationMetrics();
  metrics.connectionOpened();
  metrics.updateReceived(24);
  metrics.persistenceFailed();
  metrics.compactionCompleted();
  metrics.connectionClosed();
  const output = metrics.renderPrometheus();
  assert.match(output, /disnote_collab_connections 0/);
  assert.match(output, /disnote_collab_updates_total 1/);
  assert.match(output, /disnote_collab_update_bytes_total 24/);
  assert.match(output, /disnote_collab_persistence_failures_total 1/);
  assert.match(output, /disnote_collab_compactions_total 1/);
});
