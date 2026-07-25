import type { BlockRegistry, DisNoteDocument } from "@disnote/document-core";
import { checksum, extractDocumentPlainText } from "@disnote/document-core";
import type {
  ArchiveDocumentInput,
  DocumentKind,
  DocumentRepository,
  DocumentRevision,
  DocumentRevisionSummary,
  PublishDocumentInput,
  PublishedDocument,
  PublishedSlugQuery,
  SaveDraftInput,
  SaveDraftResult,
  StoredDocument,
  UnpublishDocumentInput,
} from "./document-repository.js";

export interface CreateDocumentInput {
  slug: string;
  locale: string;
  kind: DocumentKind;
  title: string;
  actor: string;
  document: DisNoteDocument;
}

export interface InMemoryRepositoryOptions {
  registry: BlockRegistry;
  now?: () => string;
}

/**
 * Reference DocumentRepository used by contract tests and demos. Enforces
 * optimistic concurrency, idempotency and immutable published revisions.
 * Not for production persistence.
 */
export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly stored = new Map<string, StoredDocument>();
  private readonly revisions = new Map<string, DocumentRevision[]>();
  private readonly idempotency = new Map<string, number>();
  private readonly registry: BlockRegistry;
  private readonly now: () => string;

  constructor(options: InMemoryRepositoryOptions) {
    this.registry = options.registry;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async create(input: CreateDocumentInput): Promise<StoredDocument> {
    const ts = this.now();
    const stored: StoredDocument = {
      id: input.document.id,
      slug: input.slug,
      locale: input.locale,
      kind: input.kind,
      title: input.title,
      status: "draft",
      currentRevision: 1,
      schemaVersion: input.document.schemaVersion,
      createdBy: input.actor,
      createdAt: ts,
      updatedAt: ts,
    };
    this.stored.set(stored.id, stored);
    this.revisions.set(stored.id, [this.makeRevision(input.document, 1, input.actor, "editor", ts)]);
    return stored;
  }

  async getById(id: string): Promise<StoredDocument | null> {
    return this.stored.get(id) ?? null;
  }

  async getPublishedBySlug(query: PublishedSlugQuery): Promise<PublishedDocument | null> {
    for (const stored of this.stored.values()) {
      if (
        stored.slug === query.slug &&
        stored.locale === query.locale &&
        stored.status === "published" &&
        stored.publishedRevision !== undefined
      ) {
        const revision = this.revisionOf(stored.id, stored.publishedRevision);
        if (revision) return { stored, revision };
      }
    }
    return null;
  }

  async saveDraft(input: SaveDraftInput): Promise<SaveDraftResult> {
    const stored = this.stored.get(input.documentId);
    if (!stored) return { ok: false, reason: "not-found" };

    const seen = this.idempotency.get(input.idempotencyKey);
    if (seen !== undefined) return { ok: true, revision: seen };

    if (input.expectedRevision !== stored.currentRevision) {
      return { ok: false, reason: "revision-conflict", currentRevision: stored.currentRevision };
    }

    const nextRevision = stored.currentRevision + 1;
    const ts = this.now();
    const list = this.revisions.get(input.documentId)!;
    list.push(this.makeRevision(input.document, nextRevision, input.actor, "editor", ts));
    const updated: StoredDocument = {
      ...stored,
      currentRevision: nextRevision,
      schemaVersion: input.document.schemaVersion,
      updatedAt: ts,
    };
    this.stored.set(stored.id, updated);
    this.idempotency.set(input.idempotencyKey, nextRevision);
    return { ok: true, revision: nextRevision };
  }

  async publish(input: PublishDocumentInput): Promise<PublishedDocument> {
    const stored = this.requireStored(input.documentId);
    const revision = this.revisionOf(stored.id, input.revision);
    if (!revision) throw new Error(`Revision ${input.revision} not found for ${stored.id}.`);
    const updated: StoredDocument = {
      ...stored,
      status: "published",
      publishedRevision: input.revision,
      updatedAt: this.now(),
    };
    this.stored.set(stored.id, updated);
    return { stored: updated, revision };
  }

  async unpublish(input: UnpublishDocumentInput): Promise<void> {
    const stored = this.requireStored(input.documentId);
    const next: StoredDocument = { ...stored, status: "draft", updatedAt: this.now() };
    delete next.publishedRevision;
    this.stored.set(stored.id, next);
  }

  async archive(input: ArchiveDocumentInput): Promise<void> {
    const stored = this.requireStored(input.documentId);
    this.stored.set(stored.id, { ...stored, status: "archived", updatedAt: this.now() });
  }

  async listRevisions(documentId: string): Promise<DocumentRevisionSummary[]> {
    const list = this.revisions.get(documentId) ?? [];
    return list.map((r) => ({
      documentId: r.documentId,
      revision: r.revision,
      checksum: r.checksum,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      source: r.source,
    }));
  }

  async getRevision(documentId: string, revision: number): Promise<DocumentRevision | null> {
    return this.revisionOf(documentId, revision);
  }

  /* ------------------------------- internals ------------------------------ */

  private makeRevision(
    document: DisNoteDocument,
    revision: number,
    actor: string,
    source: DocumentRevision["source"],
    ts: string,
  ): DocumentRevision {
    return {
      documentId: document.id,
      revision,
      document,
      plainText: extractDocumentPlainText(document, this.registry),
      checksum: checksum(document),
      createdBy: actor,
      createdAt: ts,
      source,
    };
  }

  private revisionOf(documentId: string, revision: number): DocumentRevision | null {
    return (this.revisions.get(documentId) ?? []).find((r) => r.revision === revision) ?? null;
  }

  private requireStored(id: string): StoredDocument {
    const stored = this.stored.get(id);
    if (!stored) throw new Error(`Document ${id} not found.`);
    return stored;
  }
}
