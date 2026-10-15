import { COLLABORATION_PROTOCOL, type CollaborationPacket, type CollaborationTransport } from "./provider.js";
const WEBSOCKET_CONSTANTS = { RETRY_MS: 1000, MAX_RETRY_MS: 30000, MAX_PENDING: 1000, ERROR: "collaboration-transport-limit" } as const;
/** Compatible with examples/collaboration-server: binary Yjs updates, ephemeral JSON presence. */
export class WebSocketCollaborationTransport implements CollaborationTransport {
  private socket: WebSocket | null = null;
  private readonly listeners = new Set<(packet: CollaborationPacket) => void>();
  private readonly pending: CollaborationPacket[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private retries = 0;
  constructor(private readonly getAuthenticatedUrl: () => Promise<string>, private readonly onStatus?: (status: "connecting" | "connected" | "disconnected") => void) { void this.connect(); }
  send(packet: CollaborationPacket): void {
    if (this.closed) return;
    if (this.socket?.readyState === WebSocket.OPEN) { this.write(packet); return; }
    if (this.pending.length >= WEBSOCKET_CONSTANTS.MAX_PENDING) throw new Error(WEBSOCKET_CONSTANTS.ERROR);
    this.pending.push(packet);
  }
  subscribe(listener: (packet: CollaborationPacket) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  close(): void { this.closed = true; if (this.timer) clearTimeout(this.timer); this.socket?.close(); this.socket = null; this.pending.length = 0; this.listeners.clear(); }
  private async connect(): Promise<void> {
    if (this.closed) return;
    this.onStatus?.("connecting");
    try {
      const url = await this.getAuthenticatedUrl();
      if (this.closed) return;
      const socket = new WebSocket(url); this.socket = socket; socket.binaryType = "arraybuffer";
      socket.onopen = () => {
        this.retries = 0; this.onStatus?.("connected");
        for (const packet of this.pending.splice(0)) this.write(packet);
        // Replay complete local state too: the previous socket may have dropped an unacknowledged send.
        for (const listener of this.listeners) listener({ kind: COLLABORATION_PROTOCOL.REQUEST });
        this.write({ kind: COLLABORATION_PROTOCOL.REQUEST });
      };
      socket.onmessage = event => {
        try {
          let packet: CollaborationPacket;
          if (event.data instanceof ArrayBuffer) {
            if (event.data.byteLength > COLLABORATION_PROTOCOL.MAX_BYTES) return;
            packet = { kind: COLLABORATION_PROTOCOL.UPDATE, data: new Uint8Array(event.data) };
          } else {
            if (typeof event.data !== "string" || event.data.length > COLLABORATION_PROTOCOL.MAX_BYTES) return;
            const parsed = JSON.parse(event.data) as { kind: string; data?: number[]; clientId?: number };
            if (parsed.kind === COLLABORATION_PROTOCOL.AWARENESS && Array.isArray(parsed.data) && parsed.data.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) packet = { kind: COLLABORATION_PROTOCOL.AWARENESS, data: new Uint8Array(parsed.data) };
            else if (parsed.kind === COLLABORATION_PROTOCOL.REQUEST) packet = { kind: COLLABORATION_PROTOCOL.REQUEST };
            else if (parsed.kind === COLLABORATION_PROTOCOL.LEAVE && Number.isInteger(parsed.clientId)) packet = { kind: COLLABORATION_PROTOCOL.LEAVE, clientId: parsed.clientId! };
            else return;
          }
          for (const listener of this.listeners) listener(packet);
        } catch { /* Malformed untrusted messages never reach Yjs. */ }
      };
      socket.onclose = () => this.retry(); socket.onerror = () => socket.close();
    } catch { this.retry(); }
  }
  private retry(): void {
    if (this.closed) return;
    this.onStatus?.("disconnected");
    this.timer = setTimeout(() => void this.connect(), Math.min(WEBSOCKET_CONSTANTS.MAX_RETRY_MS, WEBSOCKET_CONSTANTS.RETRY_MS * 2 ** this.retries++));
  }
  private write(packet: CollaborationPacket): void {
    if (packet.kind === COLLABORATION_PROTOCOL.UPDATE) this.socket?.send(Uint8Array.from(packet.data).buffer);
    else if (packet.kind === COLLABORATION_PROTOCOL.AWARENESS) this.socket?.send(JSON.stringify({ ...packet, data: Array.from(packet.data) }));
    else this.socket?.send(JSON.stringify(packet));
  }
}
