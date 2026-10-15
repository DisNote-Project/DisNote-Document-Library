import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
export const COLLABORATION_PROTOCOL = { UPDATE: "update", REQUEST: "request", AWARENESS: "awareness", LEAVE: "leave", FRAGMENT: "editor", MAX_BYTES: 1_000_000 } as const;
export type CollaborationPacket =
  | { kind: "update" | "awareness"; data: Uint8Array }
  | { kind: "request" }
  | { kind: "leave"; clientId: number };
export interface CollaborationTransport {
  send(packet: CollaborationPacket): void;
  subscribe(listener: (packet: CollaborationPacket) => void): () => void;
  close(): void;
}
/** Keep this XML fragment separate from the library's JSON/Y.Map snapshot binding. */
export class EditorCollaborationProvider {
  readonly awareness: Awareness;
  readonly fragment: Y.XmlFragment;
  private readonly unsubscribe: () => void;
  private readonly update: (data: Uint8Array, origin: unknown) => void;
  private readonly presence: (changes: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => void;
  constructor(readonly document: Y.Doc, private readonly transport: CollaborationTransport, fragmentName: string = COLLABORATION_PROTOCOL.FRAGMENT) {
    this.awareness = new Awareness(document);
    this.fragment = document.getXmlFragment(fragmentName);
    this.update = (data, origin) => { if (origin !== this) transport.send({ kind: COLLABORATION_PROTOCOL.UPDATE, data }); };
    this.presence = (changes, origin) => { if (origin !== this) transport.send({ kind: COLLABORATION_PROTOCOL.AWARENESS, data: encodeAwarenessUpdate(this.awareness, [...changes.added, ...changes.updated, ...changes.removed]) }); };
    document.on("update", this.update); this.awareness.on("update", this.presence);
    this.unsubscribe = transport.subscribe(packet => {
      if (packet.kind === COLLABORATION_PROTOCOL.REQUEST) {
        transport.send({ kind: COLLABORATION_PROTOCOL.UPDATE, data: Y.encodeStateAsUpdate(document) });
        transport.send({ kind: COLLABORATION_PROTOCOL.AWARENESS, data: encodeAwarenessUpdate(this.awareness, [...this.awareness.getStates().keys()]) });
      } else if (packet.kind === COLLABORATION_PROTOCOL.UPDATE && packet.data.byteLength <= COLLABORATION_PROTOCOL.MAX_BYTES) Y.applyUpdate(document, packet.data, this);
      else if (packet.kind === COLLABORATION_PROTOCOL.AWARENESS && packet.data.byteLength <= COLLABORATION_PROTOCOL.MAX_BYTES) applyAwarenessUpdate(this.awareness, packet.data, this);
      else if (packet.kind === COLLABORATION_PROTOCOL.LEAVE) removeAwarenessStates(this.awareness, [packet.clientId], this);
    });
    transport.send({ kind: COLLABORATION_PROTOCOL.REQUEST });
  }
  resynchronize(): void { this.transport.send({ kind: COLLABORATION_PROTOCOL.REQUEST }); }
  destroy(): void {
    this.awareness.setLocalState(null);
    this.transport.send({ kind: COLLABORATION_PROTOCOL.LEAVE, clientId: this.document.clientID });
    this.unsubscribe(); this.document.off("update", this.update); this.awareness.off("update", this.presence); this.awareness.destroy(); this.transport.close();
  }
}
/** Same-origin tabs only. Production networks must use an authenticated transport. */
export class BroadcastChannelCollaborationTransport implements CollaborationTransport {
  private readonly channel: BroadcastChannel;
  private readonly listeners = new Set<(packet: CollaborationPacket) => void>();
  constructor(name: string) {
    this.channel = new BroadcastChannel(name);
    this.channel.onmessage = event => {
      const packet = event.data as CollaborationPacket;
      if (!packet || !Object.values(COLLABORATION_PROTOCOL).includes(packet.kind)) return;
      for (const listener of this.listeners) listener(packet);
    };
  }
  send(packet: CollaborationPacket): void { this.channel.postMessage(packet); }
  subscribe(listener: (packet: CollaborationPacket) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  close(): void { this.channel.close(); this.listeners.clear(); }
}
