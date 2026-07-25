import { createServer, type IncomingMessage } from "node:http";
import { pathToFileURL } from "node:url";
import { MongoClient } from "mongodb";
import { WebSocket, WebSocketServer } from "ws";
import { verifyCollaborationToken } from "./auth.js";
import { CollaborationMetrics } from "./metrics.js";
import { MongoUpdateStore } from "./mongo-update-store.js";

const MAX_UPDATE_BYTES = 1_000_000;

export async function startServer(options: {
  mongoUri: string;
  tokenSecret: string;
  port: number;
}): Promise<() => Promise<void>> {
  const mongo = new MongoClient(options.mongoUri);
  await mongo.connect();
  const metrics = new CollaborationMetrics();
  const store = new MongoUpdateStore(mongo.db("disnote_collaboration"), { metrics });
  await store.initialize();
  const rooms = new Map<string, Set<WebSocket>>();

  const http = createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (request.url === "/metrics") {
      response.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
      response.end(metrics.renderPrometheus());
      return;
    }
    response.writeHead(404).end();
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_UPDATE_BYTES });

  http.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const documentId = url.searchParams.get("documentId") ?? "";
    const token = url.searchParams.get("token") ?? "";
    const claims = verifyCollaborationToken(token, documentId, options.tokenSecret);
    if (!claims) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, documentId, claims.sub);
    });
  });

  wss.on("connection", (
    ws: WebSocket,
    _request: IncomingMessage,
    documentId: string,
  ) => {
    void initializeConnection(ws, documentId).catch(() => {
      metrics.persistenceFailed();
      ws.close(1011, "Collaboration storage unavailable");
    });
  });

  async function initializeConnection(
    ws: WebSocket,
    documentId: string,
  ): Promise<void> {
    const room = rooms.get(documentId) ?? new Set<WebSocket>();
    room.add(ws);
    rooms.set(documentId, room);
    metrics.connectionOpened();

    ws.on("close", () => {
      if (room.delete(ws)) {
        if (room.size === 0) rooms.delete(documentId);
        metrics.connectionClosed();
      }
    });

    for (const update of await store.loadUpdates(documentId)) {
      ws.send(update, { binary: true });
    }

    ws.on("message", (data, isBinary) => {
      if (!isBinary) return;
      const update = new Uint8Array(data as Buffer);
      if (update.byteLength > MAX_UPDATE_BYTES) {
        ws.close(1009, "Update too large");
        return;
      }
      void store.appendUpdate(documentId, update)
        .then(() => {
          metrics.updateReceived(update.byteLength);
          for (const peer of room) {
            if (peer !== ws && peer.readyState === WebSocket.OPEN) {
              peer.send(update, { binary: true });
            }
          }
        })
        .catch(() => {
          metrics.persistenceFailed();
          ws.close(1011, "Collaboration update was not persisted");
        });
    });

    ws.on("error", () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1011, "WebSocket error");
      }
    });

  }

  await new Promise<void>((resolve) => http.listen(options.port, "0.0.0.0", resolve));
  return async () => {
    for (const client of wss.clients) client.close(1001, "Server shutdown");
    await new Promise<void>((resolve, reject) =>
      http.close((error) => error ? reject(error) : resolve()),
    );
    await mongo.close();
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mongoUri = process.env["MONGODB_URI"];
  const tokenSecret = process.env["COLLAB_TOKEN_SECRET"];
  if (!mongoUri || !tokenSecret) {
    throw new Error("MONGODB_URI and COLLAB_TOKEN_SECRET are required.");
  }
  await startServer({
    mongoUri,
    tokenSecret,
    port: Number(process.env["PORT"] ?? 8787),
  });
}
