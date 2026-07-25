import type { DisNoteDocument } from "../core/index.js";

export type DocumentKind =
  | "LEGAL_POLICY"
  | "ARTICLE"
  | "PRODUCT_UPDATE"
  | "CHANGELOG"
  | "LANDING_PAGE";

export type DocumentStatus = "draft" | "published" | "archived";

export interface StoredDocument {
  id: string;
  slug: string;
  locale: string;
  kind: DocumentKind;
  title: string;
  status: DocumentStatus;
  currentRevision: number;
  publishedRevision?: number;
  schemaVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRevision {
  documentId: string;
  revision: number;
  document: DisNoteDocument;
  plainText: string;
  checksum: string;
  createdBy: string;
  createdAt: string;
  source: "editor" | "migration" | "import" | "api";
}

export interface DocumentRevisionSummary {
  documentId: string;
  revision: number;
  checksum: string;
  createdBy: string;
  createdAt: string;
  source: DocumentRevision["source"];
}

export interface PublishedDocument {
  stored: StoredDocument;
  revision: DocumentRevision;
}

export interface PublishedSlugQuery {
  slug: string;
  locale: string;
}

/* ------------------------------ capabilities ------------------------------ */
/* Interface Segregation: consumers depend only on the capability they need.  */

export interface DocumentReader {
  getById(id: string): Promise<StoredDocument | null>;
  getPublishedBySlug(input: PublishedSlugQuery): Promise<PublishedDocument | null>;
}

export interface SaveDraftInput {
  documentId: string;
  expectedRevision: number;
  document: DisNoteDocument;
  idempotencyKey: string;
  actor: string;
}

export type SaveDraftResult =
  | { ok: true; revision: number }
  | { ok: false; reason: "revision-conflict"; currentRevision: number }
  | { ok: false; reason: "not-found" };

export interface DraftWriter {
  saveDraft(input: SaveDraftInput): Promise<SaveDraftResult>;
}

export interface PublishDocumentInput {
  documentId: string;
  revision: number;
  actor: string;
}

export interface UnpublishDocumentInput {
  documentId: string;
  actor: string;
}

export interface ArchiveDocumentInput {
  documentId: string;
  actor: string;
}

export interface DocumentPublisher {
  publish(input: PublishDocumentInput): Promise<PublishedDocument>;
  unpublish(input: UnpublishDocumentInput): Promise<void>;
  archive(input: ArchiveDocumentInput): Promise<void>;
}

export interface RevisionReader {
  listRevisions(documentId: string): Promise<DocumentRevisionSummary[]>;
  getRevision(documentId: string, revision: number): Promise<DocumentRevision | null>;
}

/** Convenience union for a full repository implementation. */
export interface DocumentRepository
  extends DocumentReader,
    DraftWriter,
    DocumentPublisher,
    RevisionReader {}
