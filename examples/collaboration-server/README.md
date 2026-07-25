# Collaboration server reference

Authenticated WebSocket server backed by MongoDB update/snapshot collections.
It demonstrates durable Yjs updates, reconnect sync, distributed compaction
locking, payload limits and Prometheus-style metrics.

Required environment:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0
COLLAB_TOKEN_SECRET=replace-me
PORT=8787
```

Run:

```bash
npm run dev --workspace @disnote/collaboration-server
```

This is a deployment reference. Put it behind TLS, rate limiting and your real
identity provider before exposing it publicly.
