import { validateDocument, type DisNoteDocument } from "../core/index.js";
import { OFFLINE_CONSTANTS, type OfflineDocument, type OfflineRemote, type OfflineStore } from "./model.js";
export class OfflineDocumentController {
  private readonly running = new Map<string, Promise<OfflineDocument>>();
  constructor(private readonly store: OfflineStore, private readonly remote: OfflineRemote, private readonly actor: string, private readonly generateId: () => string = () => crypto.randomUUID()) {}
  read(id: string): Promise<OfflineDocument | null> { return this.store.read(id); }
  async download(document: DisNoteDocument, revision: number): Promise<OfflineDocument> {
    if (!validateDocument(document).ok || !Number.isInteger(revision) || revision < 1) throw new Error(OFFLINE_CONSTANTS.INVALID);
    return this.store.mutate(document.id, current => {
      if (current?.pending.length) return current;
      return { id: document.id, document: structuredClone(document), remoteRevision: revision, pending: [] };
    });
  }
  async edit(document: DisNoteDocument): Promise<OfflineDocument> {
    if (!validateDocument(document).ok) throw new Error(OFFLINE_CONSTANTS.INVALID);
    const token = this.generateId();
    return this.store.mutate(document.id, current => {
      if (!current) throw new Error(OFFLINE_CONSTANTS.INVALID);
      const last = current.pending[current.pending.length - 1];
      return { ...current, document: structuredClone(document), pending: [...current.pending, { id: token, expectedRevision: last ? last.expectedRevision + 1 : current.remoteRevision, document: structuredClone(document) }] };
    });
  }
  flush(id: string): Promise<OfflineDocument> {
    const running = this.running.get(id); if (running) return running;
    const work = this.synchronize(id).finally(() => this.running.delete(id)); this.running.set(id, work); return work;
  }
  private async synchronize(id: string): Promise<OfflineDocument> {
    let current = await this.store.read(id);
    if (!current) throw new Error(OFFLINE_CONSTANTS.INVALID);
    while (current.pending.length && current.conflict === undefined) {
      const write = current.pending[0]!;
      const result = await this.remote.saveDraft({ documentId: id, expectedRevision: write.expectedRevision, document: write.document, idempotencyKey: write.id, actor: this.actor });
      if (!result.ok) {
        if (result.reason === "not-found") throw new Error(OFFLINE_CONSTANTS.INVALID);
        return this.store.mutate(id, value => {
          if (!value) throw new Error(OFFLINE_CONSTANTS.INVALID);
          return { ...value, conflict: result.currentRevision };
        });
      }
      current = await this.store.mutate(id, value => {
        if (!value) throw new Error(OFFLINE_CONSTANTS.INVALID);
        // An overlapping tab may already have acknowledged the same idempotent write.
        return { ...value, remoteRevision: Math.max(value.remoteRevision, result.revision), pending: value.pending.filter(p => p.id !== write.id) };
      });
    }
    return current;
  }
  /** Caller explicitly accepts a merge/replacement; never silently overwrite a remote conflict. */
  async resolveConflict(document: DisNoteDocument, expectedRemoteRevision: number): Promise<OfflineDocument> {
    if (!validateDocument(document).ok) throw new Error(OFFLINE_CONSTANTS.INVALID);
    const token = this.generateId();
    return this.store.mutate(document.id, current => {
      if (!current || current.conflict !== expectedRemoteRevision) throw new Error(OFFLINE_CONSTANTS.CONFLICT);
      return { id: document.id, document: structuredClone(document), remoteRevision: expectedRemoteRevision, pending: [{ id: token, expectedRevision: expectedRemoteRevision, document: structuredClone(document) }] };
    });
  }
}
