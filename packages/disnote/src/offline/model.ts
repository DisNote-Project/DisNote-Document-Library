import type { DisNoteDocument } from "../core/index.js";
import type { SaveDraftInput, SaveDraftResult } from "../storage/index.js";
export const OFFLINE_CONSTANTS = { STORE: "documents", VERSION: 1, ERROR: "offline-storage-failed", INVALID: "invalid-offline-document", CONFLICT: "offline-revision-conflict" } as const;
export interface OfflinePendingWrite {
  id: string;
  expectedRevision: number;
  document: DisNoteDocument;
}
export interface OfflineDocument {
  id: string;
  document: DisNoteDocument;
  remoteRevision: number;
  pending: OfflinePendingWrite[];
  conflict?: number;
}
export interface OfflineStore {
  read(id: string): Promise<OfflineDocument | null>;
  /** Mutation must run atomically against the most recent stored value. */
  mutate(id: string, change: (value: OfflineDocument | null) => OfflineDocument): Promise<OfflineDocument>;
  clear(): Promise<void>;
}
export interface OfflineRemote {
  saveDraft(input: SaveDraftInput): Promise<SaveDraftResult>;
}
