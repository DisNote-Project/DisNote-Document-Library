import * as Y from "yjs";
import { articleRegistry, createDefaultRegistry, createDocument, paragraph, text, type DisNoteDocument } from "@disnote/core";
import { DatabaseService, type DatabaseSnapshot } from "@disnote/core/database";
import type { DatabaseViewProvider } from "@disnote/core/database/react";
import { CommentService, type CommentState } from "@disnote/core/comments";
import type { CommentPanelProvider } from "@disnote/core/comments/react";
import { IndexedDBRevisionRepository } from "@disnote/core/persistence/browser";
import { IndexedDBOfflineStore, OfflineDocumentController } from "@disnote/core/offline";
import { IndexedDBDocumentStateRepository } from "@disnote/core/storage/browser";
import { RevisionDocumentRepository, DocumentHistoryService, type HistoryViewProvider } from "@disnote/core/storage";
import { WorkspaceDocumentService, type WorkspaceSnapshot, type WorkspaceAction, type WorkspacePage } from "@disnote/core/workspace";
import type { WorkspaceViewProvider } from "@disnote/core/workspace/react";
import { EditorCollaborationProvider, BroadcastChannelCollaborationTransport } from "@disnote/core/collaboration/browser";
import { uiMessages } from "@disnote/core/ui";
import { PARITY_LAB } from "./constants.js";
export { PARITY_LAB } from "./constants.js";
export const offlineDocument = createDocument({ id: PARITY_LAB.DOCUMENT, metadata: { title: "Offline" }, blocks: [paragraph([text("Offline")])] });
export interface ParityRuntime {
  latestDocument(): Promise<{ document: DisNoteDocument; revision: number }>;
  consumerDocument(): Promise<DisNoteDocument>;
  database: DatabaseViewProvider;
  comments: CommentPanelProvider;
  workspace: WorkspaceViewProvider;
  history: HistoryViewProvider;
  offline: OfflineDocumentController;
  collaboration: EditorCollaborationProvider;
  resolveSharedDocument(): Promise<DisNoteDocument>;
  setRemoteAvailable(available: boolean): void;
  dispose(): void;
}
/** Demo composition root. These allow-all policies are fixtures, never production authorization. */
export async function createParityRuntime(locale: string): Promise<ParityRuntime> {
  const m = uiMessages(locale);
  const databaseRepository = new IndexedDBRevisionRepository<DatabaseSnapshot>(PARITY_LAB.DATABASE_STORE, value => value.id);
  const commentRepository = new IndexedDBRevisionRepository<CommentState>(PARITY_LAB.COMMENT_STORE, value => value.documentId);
  const workspaceRepository = new IndexedDBRevisionRepository<WorkspaceSnapshot>(PARITY_LAB.WORKSPACE_STORE, value => value.id);
  const historyStore = new IndexedDBDocumentStateRepository(PARITY_LAB.HISTORY_STORE), offlineStore = new IndexedDBOfflineStore(PARITY_LAB.OFFLINE_STORE);
  const service = new DatabaseService(databaseRepository, { async assert() {}, async canReadRecord() { return true; }, async canWriteRecord() { return true; } });
  const commentService = new CommentService(commentRepository, { async assert() {} });
  const workspaceService = new WorkspaceDocumentService(workspaceRepository, { async assert() {}, async can() { return true; } });
  const historyRepository = new RevisionDocumentRepository(historyStore, articleRegistry), historyService = new DocumentHistoryService(historyRepository, { async assert() {} });
  const document = new Y.Doc(), collaboration = new EditorCollaborationProvider(document, new BroadcastChannelCollaborationTransport(PARITY_LAB.ROOM));
  let remoteAvailable = false;
  const offline = new OfflineDocumentController(offlineStore, { async saveDraft(input) { if (!remoteAvailable) throw new Error(PARITY_LAB.REMOTE_ERROR); return historyRepository.saveDraft(input); } }, PARITY_LAB.ACTOR);
  const listeners = new Set<() => void>();
  const execute = async (actions: WorkspaceAction[]) => { const state = await workspaceRepository.read(PARITY_LAB.WORKSPACE); if (!state) throw new Error(PARITY_LAB.INITIALIZATION_ERROR); await workspaceService.execute(PARITY_LAB.ACTOR, state.id, state.revision, actions); for (const listener of listeners) listener(); };
  const dispose = () => { collaboration.destroy(); document.destroy(); listeners.clear(); void databaseRepository.close(); void commentRepository.close(); void workspaceRepository.close(); void historyStore.close(); void offlineStore.close(); };
  try {
    if (!await databaseRepository.read(PARITY_LAB.DATABASE)) {
      try { await service.create(PARITY_LAB.ACTOR, { id: PARITY_LAB.DATABASE, title: "Tasks", properties: [{ id: "title", name: m.title, type: "text" }, { id: "status", name: m.board, type: "select", options: ["todo", "done"] }, { id: "date", name: m.calendar, type: "date" }], records: [{ id: "seed", values: { title: "First task", status: "todo", date: "2026-10-14" } }] }); }
      catch { if (!await databaseRepository.read(PARITY_LAB.DATABASE)) throw new Error(PARITY_LAB.INITIALIZATION_ERROR); }
    }
    if (!await historyRepository.getById(PARITY_LAB.DOCUMENT)) {
      try {
        await historyRepository.create({ document: offlineDocument, slug: PARITY_LAB.DOCUMENT, locale: "en", kind: "ARTICLE", title: "Offline", actor: PARITY_LAB.ACTOR });
        await historyRepository.saveDraft({ documentId: PARITY_LAB.DOCUMENT, document: { ...offlineDocument, blocks: [paragraph([text("Revision two")])] }, actor: PARITY_LAB.ACTOR, idempotencyKey: "seed-second-revision", expectedRevision: 1 });
      } catch { if (!await historyRepository.getById(PARITY_LAB.DOCUMENT)) throw new Error(PARITY_LAB.INITIALIZATION_ERROR); }
    }
    if (!(await workspaceRepository.read(PARITY_LAB.WORKSPACE))?.pages.length) {
      try {
        if (!await workspaceRepository.read(PARITY_LAB.WORKSPACE)) { try { await workspaceService.create(PARITY_LAB.ACTOR, PARITY_LAB.WORKSPACE); } catch { if (!await workspaceRepository.read(PARITY_LAB.WORKSPACE)) throw new Error(PARITY_LAB.INITIALIZATION_ERROR); } }
        const owner: WorkspacePage = { id: PARITY_LAB.OWNER, parentId: null, revision: 1, trashed: false, document: createDocument({ id: PARITY_LAB.OWNER, metadata: { title: "Owner" }, blocks: [paragraph([text("Owner")])] }) };
        const consumer: WorkspacePage = { id: PARITY_LAB.CONSUMER, parentId: owner.id, revision: 1, trashed: false, document: createDocument({ id: PARITY_LAB.CONSUMER, metadata: { title: "Consumer" }, blocks: ["first", "second"].map(id => ({ id, type: "syncedBlock", version: 1, props: { syncedBlockId: PARITY_LAB.SOURCE } })) }) };
        await execute([{ kind: "createPage", page: owner }, { kind: "createPage", page: consumer }, { kind: "saveSharedBlock", source: { id: PARITY_LAB.SOURCE, ownerPageId: owner.id, revision: 1, blocks: [paragraph([text("Shared seed")])] }, expectedRevision: null }]);
      } catch { if (!(await workspaceRepository.read(PARITY_LAB.WORKSPACE))?.pages.length) throw new Error(PARITY_LAB.INITIALIZATION_ERROR); }
    }
  } catch (error) { dispose(); throw error; }
  return {
    latestDocument: async () => { const stored = await historyRepository.getById(PARITY_LAB.DOCUMENT); if (!stored) throw new Error(PARITY_LAB.INITIALIZATION_ERROR); return { document: (await historyService.revision(PARITY_LAB.ACTOR, stored.id, stored.currentRevision)).document, revision: stored.currentRevision }; },
    consumerDocument: async () => (await workspaceService.pages(PARITY_LAB.ACTOR, PARITY_LAB.WORKSPACE)).find(page => page.id === PARITY_LAB.CONSUMER)!.document,
    database: { query: (id, query) => service.query(PARITY_LAB.ACTOR, id, query), upsertRecord: async (id, record, revision) => { await service.upsertRecord(PARITY_LAB.ACTOR, id, record, revision); }, deleteRecord: async (id, recordId, revision) => { await service.deleteRecord(PARITY_LAB.ACTOR, id, recordId, revision); } },
    comments: { list: id => commentService.list(PARITY_LAB.ACTOR, id), create: async (id, anchor, body, revision, expected) => { await commentService.create(PARITY_LAB.ACTOR, id, anchor, body, revision, expected); }, reply: async (id, thread, body, expected) => { await commentService.reply(PARITY_LAB.ACTOR, id, thread, body, expected); }, status: async (id, thread, status, expected) => { await commentService.status(PARITY_LAB.ACTOR, id, thread, status, expected); } },
    workspace: { pages: trash => workspaceService.pages(PARITY_LAB.ACTOR, PARITY_LAB.WORKSPACE, trash), create: async (document, parentId) => execute([{ kind: "createPage", page: { id: document.id, parentId, document, trashed: false, revision: 1 } }]), move: (pageId, parentId) => execute([{ kind: "movePage", pageId, parentId }]), trash: pageId => execute([{ kind: "trashPage", pageId }]), restore: pageId => execute([{ kind: "restorePage", pageId }]), sharedSources: () => workspaceService.sharedSources(PARITY_LAB.ACTOR, PARITY_LAB.WORKSPACE), sharedSource: id => workspaceService.sharedSource(PARITY_LAB.ACTOR, PARITY_LAB.WORKSPACE, id), saveSharedSource: (source, expectedRevision) => execute([{ kind: "saveSharedBlock", source, expectedRevision }]), canEditSharedSource: () => true, breadcrumbs: () => workspaceService.breadcrumbs(PARITY_LAB.ACTOR, PARITY_LAB.WORKSPACE, PARITY_LAB.CONSUMER), subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); } },
    history: { list: id => historyService.list(PARITY_LAB.ACTOR, id), revision: async (id, revision) => (await historyService.revision(PARITY_LAB.ACTOR, id, revision)).document, restore: (id, revision, expected, key) => historyService.restore(PARITY_LAB.ACTOR, id, revision, expected, key) },
    offline, collaboration, resolveSharedDocument: () => workspaceService.resolveDocument(PARITY_LAB.ACTOR, PARITY_LAB.WORKSPACE, PARITY_LAB.CONSUMER), setRemoteAvailable: available => { remoteAvailable = available; }, dispose,
  };
}
export const parityRegistry = createDefaultRegistry();
