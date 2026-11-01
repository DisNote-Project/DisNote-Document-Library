import { createDocument, paragraph, checksum, type DisNoteDocument } from "../core/index.js";
import { sha256Hex } from "../core/serialization/sha256.js";
import type { CreateDocumentInput, DocumentRepository, StoredDocument, SaveDraftResult } from "../storage/index.js";
import { DATABASE_ERRORS, type DatabaseProperty, type DatabaseRecord } from "./model.js";

export function recordDocumentId(databaseId: string, recordId: string): string { return `record_${sha256Hex(JSON.stringify([databaseId, recordId]))}`; }
export interface RecordPageAccess {
  record(actor: string, databaseId: string, recordId: string, action?: "read" | "write"): Promise<{ record: DatabaseRecord; properties: DatabaseProperty[]; revision: number }>;
}
export interface RecordPageRepository extends Pick<DocumentRepository, "getById" | "saveDraft" | "getRevision" | "listRevisions"> { create(input: CreateDocumentInput): Promise<StoredDocument> }
export interface RecordPageState { record: DatabaseRecord; properties: DatabaseProperty[]; databaseRevision: number; document: DisNoteDocument; revision: number }
/** Record identity authorizes every operation; page ownership is never accepted from client JSON. */
export class RecordPageService {
  constructor(private readonly access: RecordPageAccess, private readonly documents: RecordPageRepository) {}
  async open(actor: string, databaseId: string, recordId: string, locale = "en"): Promise<RecordPageState> {
    const result = await this.access.record(actor, databaseId, recordId), id = recordDocumentId(databaseId, recordId), stored = await this.documents.getById(id);
    const title = String(result.record.values[result.properties.find(property => property.type === "text")?.id ?? ""] ?? recordId);
    const revision = stored ? await this.documents.getRevision(id, stored.currentRevision) : null;
    return { record: result.record, properties: result.properties, databaseRevision: result.revision, document: revision?.document ?? createDocument({ id, metadata: { title, locale: locale.toLowerCase().startsWith("vi") ? "vi" : "en" }, blocks: [paragraph([])] }), revision: stored?.currentRevision ?? 0 };
  }
  async save(actor: string, databaseId: string, recordId: string, document: DisNoteDocument, expectedRevision: number, key: string): Promise<SaveDraftResult> {
    await this.access.record(actor, databaseId, recordId, "write");
    const id = recordDocumentId(databaseId, recordId);
    if (document.id !== id || !Number.isInteger(expectedRevision) || expectedRevision < 0 || typeof key !== "string" || !key || key.length > 200) throw new Error(DATABASE_ERRORS.INVALID);
    if (expectedRevision === 0) {
      const existing = await this.documents.getById(id);
      if (existing) {
        const previous = await this.documents.getRevision(id, existing.currentRevision);
        return existing.currentRevision === 1 && previous?.createdBy === actor && checksum(previous.document) === checksum(document) ? { ok: true, revision: 1 } : { ok: false, reason: "revision-conflict", currentRevision: existing.currentRevision };
      }
      await this.documents.create({ document, slug: id, locale: document.metadata.locale ?? "en", kind: "ARTICLE", title: document.metadata.title ?? recordId, actor });
      return { ok: true, revision: 1 };
    }
    return this.documents.saveDraft({ document, documentId: id, expectedRevision, actor, idempotencyKey: sha256Hex(JSON.stringify([actor, key, checksum(document)])) });
  }
  async history(actor: string, databaseId: string, recordId: string) { await this.access.record(actor, databaseId, recordId); return this.documents.listRevisions(recordDocumentId(databaseId, recordId)); }
  async revision(actor: string, databaseId: string, recordId: string, revision: number) {
    await this.access.record(actor, databaseId, recordId);
    if (!Number.isInteger(revision) || revision < 1) throw new Error(DATABASE_ERRORS.INVALID);
    const found = await this.documents.getRevision(recordDocumentId(databaseId, recordId), revision);
    if (!found) throw new Error(DATABASE_ERRORS.MISSING); return found.document;
  }
  async restore(actor: string, databaseId: string, recordId: string, revision: number, expectedRevision: number, key: string) {
    await this.access.record(actor, databaseId, recordId, "write");
    return this.save(actor, databaseId, recordId, await this.revision(actor, databaseId, recordId, revision), expectedRevision, key);
  }
}
