import type { DisNoteDocument } from "../core/index.js";

/** Ephemeral presence — never persisted into a document revision. */
export interface Awareness {
  userId: string;
  color: string;
  selection?: unknown;
  active: boolean;
}

export interface CollaborationProvider {
  connect(documentId: string): Promise<void>;
  disconnect(): Promise<void>;
  /** Produce a stable snapshot to convert into an immutable DisNote revision. */
  snapshot(): Promise<DisNoteDocument>;
  onAwareness(handler: (states: Awareness[]) => void): () => void;
}

export interface CollabUpdate {
  documentId: string;
  sequence: number;
  update: Uint8Array;
  createdAt: string;
}

export interface CollabSnapshot {
  documentId: string;
  stateVector: Uint8Array;
  snapshot: Uint8Array;
  createdAt: string;
}

export interface UpdatePersistence {
  appendUpdate(documentId: string, update: Uint8Array): Promise<void>;
  loadUpdates(documentId: string): Promise<Uint8Array[]>;
  compact(documentId: string): Promise<void>;
}
