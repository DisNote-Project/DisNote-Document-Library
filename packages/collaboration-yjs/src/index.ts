/**
 * @disnote/collaboration-yjs
 *
 * The CRDT-agnostic core (update log, compaction, snapshot → revision) is
 * exported here and is fully testable without Yjs. The actual Yjs binding lives
 * at src/yjs/ and is built separately (needs Yjs as a peer). Realtime only
 * starts AFTER single-user draft + revision + publish are stable (Milestone 13).
 */
export type {
  Awareness,
  CollaborationProvider,
  UpdatePersistence,
  CollabUpdate,
  CollabSnapshot,
} from "./contracts.js";
export {
  InMemoryUpdateStore,
  type UpdateStoreOptions,
} from "./persistence/update-store.js";
export {
  snapshotToRevision,
  type StableRevision,
  type SnapshotResult,
} from "./snapshot.js";
export {
  seedYDoc,
  snapshotFromYDoc,
  encodeState,
  applyUpdate,
} from "./yjs/binding.js";
