import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket as ServerSocket } from "ws";
import * as Y from "yjs";
import { EditorCollaborationProvider, WebSocketCollaborationTransport } from "../../src/collaboration/browser/index.js";
import { createCollaborationToken, verifyCollaborationToken } from "../../../../examples/collaboration-server/src/auth.js";
async function until(check: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!check()) { if (Date.now() > deadline) throw new Error("transport-timeout"); await new Promise(resolve => setTimeout(resolve, 20)); }
}
test("authenticated WebSocket transport merges updates, presence and offline edits after reconnect", async () => {
  const server = createServer(), sockets = new WebSocketServer({ noServer: true }), persisted = new Y.Doc();
  const token = createCollaborationToken({ sub: "actor", documents: ["doc"], exp: Math.floor(Date.now() / 1000) + 60 }, "fixture-secret");
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url!, "http://localhost");
    if (!verifyCollaborationToken(url.searchParams.get("token") ?? "", "doc", "fixture-secret")) { socket.destroy(); return; }
    sockets.handleUpgrade(request, socket, head, client => sockets.emit("connection", client));
  });
  sockets.on("connection", client => {
    client.send(Y.encodeStateAsUpdate(persisted), { binary: true });
    client.on("message", (data, binary) => {
      if (binary) Y.applyUpdate(persisted, new Uint8Array(data as Buffer));
      else if (JSON.parse(data.toString()).kind === "request") client.send(Y.encodeStateAsUpdate(persisted), { binary: true });
      for (const peer of sockets.clients) if (peer !== client && peer.readyState === ServerSocket.OPEN) peer.send(data, { binary });
    });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number }, url = `ws://127.0.0.1:${address.port}/?token=${token}`;
  let statusA = "", statusB = "";
  const a = new Y.Doc(), b = new Y.Doc();
  const transportA = new WebSocketCollaborationTransport(async () => url, status => { statusA = status; }), transportB = new WebSocketCollaborationTransport(async () => url, status => { statusB = status; });
  const providerA = new EditorCollaborationProvider(a, transportA), providerB = new EditorCollaborationProvider(b, transportB);
  try {
    await until(() => statusA === "connected" && statusB === "connected");
    a.getText("content").insert(0, "A");
    await until(() => b.getText("content").toString() === "A");
    providerA.awareness.setLocalState({ user: { name: "Actor A" } });
    await until(() => providerB.awareness.getStates().has(a.clientID));
    // Both clients keep editing while their sockets are unavailable; full state replay must merge them.
    for (const client of sockets.clients) client.close();
    await until(() => statusA === "disconnected" && statusB === "disconnected");
    a.getText("content").insert(1, " offline A"); b.getText("content").insert(1, " offline B");
    await until(() => statusA === "connected" && statusB === "connected");
    await until(() => a.getText("content").toString() === b.getText("content").toString() && persisted.getText("content").toString().includes("offline A") && persisted.getText("content").toString().includes("offline B"));
    assert.equal(a.getText("content").toString(), persisted.getText("content").toString());
  } finally {
    providerA.destroy(); providerB.destroy(); a.destroy(); b.destroy(); persisted.destroy();
    for (const client of sockets.clients) client.terminate();
    await new Promise<void>(resolve => sockets.close(() => resolve())); await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
