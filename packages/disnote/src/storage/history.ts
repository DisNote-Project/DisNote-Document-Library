import type { DisNoteDocument } from "../core/index.js";
import { previewDiff, type DiffEntry } from "../search-ai/ai-operations.js";
import type { DocumentRepository, DocumentRevision, DocumentRevisionSummary, SaveDraftResult } from "./document-repository.js";
export const HISTORY_ERRORS = { MISSING: "document-revision-not-found", INVALID: "invalid-document-revision" } as const;
export interface HistoryPolicy { assert(actor: string, documentId: string, action: "read" | "restore"): Promise<void> }
export class DocumentHistoryService {
  constructor(private readonly repository: DocumentRepository, private readonly policy: HistoryPolicy) {}
  async list(actor: string, documentId: string): Promise<DocumentRevisionSummary[]> { await this.policy.assert(actor, documentId, "read"); return this.repository.listRevisions(documentId); }
  async revision(actor: string, documentId: string, revision: number): Promise<DocumentRevision> {
    await this.policy.assert(actor, documentId, "read");
    if (!Number.isInteger(revision) || revision < 1) throw new Error(HISTORY_ERRORS.INVALID);
    const found = await this.repository.getRevision(documentId, revision); if (!found) throw new Error(HISTORY_ERRORS.MISSING); return found;
  }
  async compare(actor: string, documentId: string, before: number, after: number): Promise<DiffEntry[]> {
    const first = await this.revision(actor, documentId, before), second = await this.revision(actor, documentId, after);
    return previewDiff(first.document, second.document);
  }
  async restore(actor: string, documentId: string, revision: number, expectedRevision: number, idempotencyKey: string): Promise<SaveDraftResult> {
    await this.policy.assert(actor, documentId, "restore");
    const source = await this.revision(actor, documentId, revision);
    return this.repository.saveDraft({ documentId, expectedRevision, idempotencyKey, actor, document: source.document });
  }
}
export interface HistoryViewProvider {
  list(documentId: string): Promise<DocumentRevisionSummary[]>;
  revision(documentId: string, revision: number): Promise<DisNoteDocument>;
  restore(documentId: string, revision: number, expectedRevision: number, idempotencyKey: string): Promise<SaveDraftResult>;
}
