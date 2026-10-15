import { checksum, extractDocumentPlainText, validateDocument, type BlockRegistry, type DisNoteDocument } from "../core/index.js";
import type { DocumentRepository, DocumentRevision, DocumentRevisionSummary, StoredDocument, SaveDraftInput, SaveDraftResult, PublishedDocument, PublishDocumentInput, PublishedSlugQuery, UnpublishDocumentInput, ArchiveDocumentInput } from "./document-repository.js";
import type { CreateDocumentInput } from "./in-memory-repository.js";
export const REVISION_ERRORS = { INVALID: "invalid-revision-document", MISSING: "revision-document-not-found", CONFLICT: "revision-store-conflict" } as const;
export interface DocumentStoreState {
  id: string;
  /** Store CAS version includes publish/archive mutations; distinct from content revision. */
  revision: number;
  stored: StoredDocument;
  revisions: DocumentRevision[];
  idempotency: Record<string, number>;
}
export interface DocumentStateRepository {
  read(id: string): Promise<DocumentStoreState | null>;
  write(state: DocumentStoreState, expectedRevision: number | null): Promise<boolean>;
  /** write must atomically enforce a unique stored.slug/stored.locale constraint. */
  findBySlug(query: PublishedSlugQuery): Promise<DocumentStoreState | null>;
}
/** Persistent document implementation over an injected transactional CAS adapter. */
export class RevisionDocumentRepository implements DocumentRepository {
  constructor(private readonly states: DocumentStateRepository, private readonly registry: BlockRegistry, private readonly now: () => string = () => new Date().toISOString()) {}
  async create(input: CreateDocumentInput): Promise<StoredDocument> {
    this.validate(input.document);
    if (await this.states.findBySlug({ slug: input.slug, locale: input.locale })) throw new Error(REVISION_ERRORS.CONFLICT);
    const now = this.now(), stored: StoredDocument = { id: input.document.id, slug: input.slug, locale: input.locale, kind: input.kind, title: input.title, status: "draft", currentRevision: 1, schemaVersion: input.document.schemaVersion, createdBy: input.actor, createdAt: now, updatedAt: now };
    const state: DocumentStoreState = { id: stored.id, revision: 1, stored, revisions: [this.makeRevision(input.document, 1, input.actor, now)], idempotency: {} };
    if (!await this.states.write(state, null)) throw new Error(REVISION_ERRORS.CONFLICT);
    return structuredClone(stored);
  }
  async getById(id: string): Promise<StoredDocument | null> { return structuredClone((await this.states.read(id))?.stored ?? null); }
  async getPublishedBySlug(query: PublishedSlugQuery): Promise<PublishedDocument | null> {
    const state = await this.states.findBySlug(query);
    if (!state || state.stored.status !== "published" || state.stored.slug !== query.slug || state.stored.locale !== query.locale) return null;
    const revision = state.revisions.find(r => r.revision === state.stored.publishedRevision);
    return revision ? structuredClone({ stored: state.stored, revision }) : null;
  }
  async saveDraft(input: SaveDraftInput): Promise<SaveDraftResult> {
    this.validate(input.document);
    if (input.document.id !== input.documentId || !input.idempotencyKey) throw new Error(REVISION_ERRORS.INVALID);
    for (let attempt = 0; attempt < 5; attempt++) {
      const state = await this.states.read(input.documentId);
      if (!state) return { ok: false, reason: "not-found" };
      const accepted = Object.prototype.hasOwnProperty.call(state.idempotency, input.idempotencyKey) ? state.idempotency[input.idempotencyKey] : undefined;
      if (accepted !== undefined) return { ok: true, revision: accepted };
      if (state.stored.currentRevision !== input.expectedRevision) return { ok: false, reason: "revision-conflict", currentRevision: state.stored.currentRevision };
      const now = this.now(), nextRevision = input.expectedRevision + 1;
      const next = structuredClone(state); next.revision++;
      next.stored = { ...next.stored, currentRevision: nextRevision, updatedAt: now, title: input.document.metadata.title ?? next.stored.title, schemaVersion: input.document.schemaVersion };
      next.revisions.push(this.makeRevision(input.document, nextRevision, input.actor, now));
      Object.defineProperty(next.idempotency, input.idempotencyKey, { value: nextRevision, enumerable: true, writable: true, configurable: true });
      if (await this.states.write(next, state.revision)) return { ok: true, revision: nextRevision };
    }
    throw new Error(REVISION_ERRORS.CONFLICT);
  }
  async listRevisions(documentId: string): Promise<DocumentRevisionSummary[]> {
    const state = await this.states.read(documentId);
    return (state?.revisions ?? []).map(({ document: _document, plainText: _text, ...summary }) => structuredClone(summary));
  }
  async getRevision(documentId: string, revision: number): Promise<DocumentRevision | null> { return structuredClone((await this.states.read(documentId))?.revisions.find(r => r.revision === revision) ?? null); }
  async publish(input: PublishDocumentInput): Promise<PublishedDocument> {
    const result = await this.change(input.documentId, state => {
      if (!state.revisions.some(r => r.revision === input.revision)) throw new Error(REVISION_ERRORS.MISSING);
      state.stored.status = "published"; state.stored.publishedRevision = input.revision;
    });
    return structuredClone({ stored: result.stored, revision: result.revisions.find(r => r.revision === input.revision)! });
  }
  async unpublish(input: UnpublishDocumentInput): Promise<void> { await this.change(input.documentId, state => { state.stored.status = "draft"; delete state.stored.publishedRevision; }); }
  async archive(input: ArchiveDocumentInput): Promise<void> { await this.change(input.documentId, state => { state.stored.status = "archived"; }); }
  private async change(id: string, mutate: (state: DocumentStoreState) => void): Promise<DocumentStoreState> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const state = await this.states.read(id); if (!state) throw new Error(REVISION_ERRORS.MISSING);
      const next = structuredClone(state); mutate(next); next.revision++; next.stored.updatedAt = this.now();
      if (await this.states.write(next, state.revision)) return next;
    }
    throw new Error(REVISION_ERRORS.CONFLICT);
  }
  private validate(document: DisNoteDocument): void { if (!validateDocument(document, { registry: this.registry, strictUnknownBlocks: true }).ok) throw new Error(REVISION_ERRORS.INVALID); }
  private makeRevision(document: DisNoteDocument, revision: number, actor: string, createdAt: string): DocumentRevision { return { documentId: document.id, revision, document: structuredClone(document), plainText: extractDocumentPlainText(document, this.registry), checksum: checksum(document), createdBy: actor, createdAt, source: "editor" }; }
}
