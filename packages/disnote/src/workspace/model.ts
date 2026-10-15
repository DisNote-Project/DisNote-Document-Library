import type { DisNoteBlock, DisNoteDocument } from "../core/index.js";
export const WORKSPACE_ERRORS = {
  DENIED: "workspace-document-access-denied", MISSING: "workspace-document-not-found",
  CONFLICT: "workspace-document-conflict", CYCLE: "workspace-document-cycle",
  INVALID: "invalid-workspace-document", SYNC_MISSING: "synced-source-not-found",
} as const;
export const WORKSPACE_BLOCKS = { SYNCED: "syncedBlock", BREADCRUMB: "breadcrumb" } as const;
export interface WorkspacePage {
  id: string;
  parentId: string | null;
  document: DisNoteDocument;
  trashed: boolean;
  revision: number;
  icon?: string;
  coverAssetId?: string;
}
export interface SharedBlockSource {
  id: string;
  ownerPageId: string;
  blocks: DisNoteBlock[];
  revision: number;
}
export interface WorkspaceSnapshot {
  id: string;
  revision: number;
  pages: WorkspacePage[];
  sharedBlocks: SharedBlockSource[];
}
export interface WorkspaceRepository {
  read(id: string): Promise<WorkspaceSnapshot | null>;
  /** Atomic compare-and-swap; null creates an absent workspace. */
  write(snapshot: WorkspaceSnapshot, expectedRevision: number | null): Promise<boolean>;
}
export interface WorkspaceDocumentPolicy {
  assert(actor: string, workspaceId: string, action: "read" | "write"): Promise<void>;
  can(actor: string, workspaceId: string, pageId: string, action: "read" | "write"): Promise<boolean>;
}
export type WorkspaceAction =
  | { kind: "createPage"; page: WorkspacePage }
  | { kind: "savePage"; pageId: string; document: DisNoteDocument; expectedRevision: number }
  | { kind: "movePage"; pageId: string; parentId: string | null }
  | { kind: "unsyncBlock"; pageId: string; blockId: string }
  | { kind: "trashPage" | "restorePage"; pageId: string }
  | { kind: "saveSharedBlock"; source: SharedBlockSource; expectedRevision: number | null };
