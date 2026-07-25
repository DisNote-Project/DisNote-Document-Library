import type { BlockRegistry, DisNoteDocument } from "@disnote/document-core";
import { validateDocument } from "@disnote/document-core";
import type { MigrationRegistry } from "@disnote/document-core";
import type {
  DocumentKind,
  DocumentPublisher,
  DocumentReader,
  DocumentRevision,
  DocumentRevisionSummary,
  DraftWriter,
  PublishedDocument,
  RevisionReader,
  StoredDocument,
} from "@disnote/storage-contracts";
import { canEdit, canPublish, requiresEffectiveDate, readEffectiveDate, type AuditEvent } from "../domain/policy.js";

/** A content store is a repository that can also create documents. */
export interface ContentStore extends DocumentReader, DraftWriter, DocumentPublisher, RevisionReader {
  create(input: {
    slug: string;
    locale: string;
    kind: DocumentKind;
    title: string;
    actor: string;
    document: DisNoteDocument;
  }): Promise<StoredDocument>;
}

export interface AuditSink {
  record(event: AuditEvent): void;
}

export interface ContentServiceDeps {
  store: ContentStore;
  registry: BlockRegistry;
  migrations?: MigrationRegistry;
  audit?: AuditSink;
  now?: () => string;
}

export type ContentError =
  | { code: "invalid-document"; issues: unknown[] }
  | { code: "archived"; message: string }
  | { code: "missing-effective-date"; message: string }
  | { code: "not-found"; message: string }
  | { code: "revision-conflict"; currentRevision: number }
  | { code: "migration-failed"; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: ContentError };

/**
 * Application service coordinating content use cases. Depends only on contracts
 * (DIP) — no NestJS, no Mongo. Validates at the boundary and migrates on read.
 */
export class ContentApplicationService {
  private readonly now: () => string;

  constructor(private readonly deps: ContentServiceDeps) {
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  async createDraft(input: {
    slug: string;
    locale: string;
    kind: DocumentKind;
    title: string;
    actor: string;
    document: DisNoteDocument;
  }): Promise<Result<StoredDocument>> {
    const validation = validateDocument(input.document, { registry: this.deps.registry });
    if (!validation.ok) return { ok: false, error: { code: "invalid-document", issues: validation.issues } };
    const stored = await this.deps.store.create(input);
    this.audit({ action: "create", actor: input.actor, documentId: stored.id, revision: 1 });
    return { ok: true, value: stored };
  }

  async saveDraft(input: {
    documentId: string;
    expectedRevision: number;
    document: DisNoteDocument;
    idempotencyKey: string;
    actor: string;
  }): Promise<Result<{ revision: number }>> {
    const stored = await this.deps.store.getById(input.documentId);
    if (!stored) return { ok: false, error: { code: "not-found", message: input.documentId } };
    if (!canEdit(stored.status)) return { ok: false, error: { code: "archived", message: "cannot edit an archived document" } };

    const validation = validateDocument(input.document, { registry: this.deps.registry });
    if (!validation.ok) return { ok: false, error: { code: "invalid-document", issues: validation.issues } };

    const result = await this.deps.store.saveDraft(input);
    if (!result.ok) {
      if (result.reason === "revision-conflict") {
        return { ok: false, error: { code: "revision-conflict", currentRevision: result.currentRevision } };
      }
      return { ok: false, error: { code: "not-found", message: input.documentId } };
    }
    this.audit({ action: "save-draft", actor: input.actor, documentId: input.documentId, revision: result.revision });
    return { ok: true, value: { revision: result.revision } };
  }

  async publish(input: { documentId: string; revision: number; actor: string }): Promise<Result<PublishedDocument>> {
    const stored = await this.deps.store.getById(input.documentId);
    if (!stored) return { ok: false, error: { code: "not-found", message: input.documentId } };
    if (!canPublish(stored.status)) return { ok: false, error: { code: "archived", message: "cannot publish an archived document" } };

    const revision = await this.deps.store.getRevision(input.documentId, input.revision);
    if (!revision) {
      return {
        ok: false,
        error: { code: "not-found", message: `revision ${input.revision} for ${input.documentId}` },
      };
    }
    if (requiresEffectiveDate(stored.kind)) {
      const effective = readEffectiveDate(revision.document.metadata.attributes);
      if (!effective) return { ok: false, error: { code: "missing-effective-date", message: "legal document needs metadata.attributes.effectiveDate" } };
    }

    const published = await this.deps.store.publish(input);
    this.audit({ action: "publish", actor: input.actor, documentId: input.documentId, revision: input.revision });
    return { ok: true, value: published };
  }

  async unpublish(input: { documentId: string; actor: string }): Promise<Result<null>> {
    const stored = await this.deps.store.getById(input.documentId);
    if (!stored) return { ok: false, error: { code: "not-found", message: input.documentId } };
    await this.deps.store.unpublish(input);
    this.audit({ action: "unpublish", actor: input.actor, documentId: input.documentId });
    return { ok: true, value: null };
  }

  async archive(input: { documentId: string; actor: string }): Promise<Result<null>> {
    const stored = await this.deps.store.getById(input.documentId);
    if (!stored) return { ok: false, error: { code: "not-found", message: input.documentId } };
    await this.deps.store.archive(input);
    this.audit({ action: "archive", actor: input.actor, documentId: input.documentId });
    return { ok: true, value: null };
  }

  /** Public read: only published revisions, validated and migrated. */
  async getPublished(slug: string, locale: string): Promise<Result<PublishedDocument | null>> {
    const published = await this.deps.store.getPublishedBySlug({ slug, locale });
    if (!published) return { ok: true, value: null };

    let document = published.revision.document;
    if (this.deps.migrations) {
      const migrated = this.deps.migrations.migrate(document);
      if (!migrated.ok) return { ok: false, error: { code: "migration-failed", message: migrated.error.message } };
      document = migrated.document;
    }
    const validated = validateDocument(document, { registry: this.deps.registry });
    if (!validated.ok) return { ok: false, error: { code: "invalid-document", issues: validated.issues } };
    return {
      ok: true,
      value: { ...published, revision: { ...published.revision, document: validated.value } },
    };
  }

  listRevisions(documentId: string): Promise<DocumentRevisionSummary[]> {
    return this.deps.store.listRevisions(documentId);
  }

  getRevision(documentId: string, revision: number): Promise<DocumentRevision | null> {
    return this.deps.store.getRevision(documentId, revision);
  }

  private audit(event: Omit<AuditEvent, "at">): void {
    this.deps.audit?.record({ ...event, at: this.now() });
  }
}
