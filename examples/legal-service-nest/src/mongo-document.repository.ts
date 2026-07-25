/**
 * Transactional MongoDB implementation of the ContentStore contract.
 *
 * Required indexes are created by initialize(). Revision history remains in a
 * separate collection so a document record never grows without a bound.
 */
import { checksum, extractDocumentPlainText, type BlockRegistry, type DisNoteDocument } from "@disnote/core";
import type { ContentStore } from "@disnote/core/legal";
import type {
  ArchiveDocumentInput,
  DocumentRevision,
  DocumentRevisionSummary,
  PublishDocumentInput,
  PublishedDocument,
  SaveDraftInput,
  SaveDraftResult,
  StoredDocument,
  UnpublishDocumentInput,
} from "@disnote/core/storage";
import type { Collection, MongoClient } from "mongodb";

interface IdempotencyRecord {
  key: string;
  documentId: string;
  revision: number;
  createdAt: string;
}

export interface MongoDocumentRepositoryCollections {
  documents: Collection<StoredDocument>;
  revisions: Collection<DocumentRevision>;
  idempotency: Collection<IdempotencyRecord>;
}

export class MongoDocumentRepository implements ContentStore {
  constructor(
    private readonly client: MongoClient,
    private readonly collections: MongoDocumentRepositoryCollections,
    private readonly registry: BlockRegistry,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async initialize(): Promise<void> {
    await Promise.all([
      this.collections.documents.createIndex({ id: 1 }, { unique: true }),
      this.collections.documents.createIndex({ slug: 1, locale: 1 }, { unique: true }),
      this.collections.revisions.createIndex({ documentId: 1, revision: 1 }, { unique: true }),
      this.collections.idempotency.createIndex({ key: 1 }, { unique: true }),
    ]);
  }

  async create(input: {
    slug: string;
    locale: string;
    kind: StoredDocument["kind"];
    title: string;
    actor: string;
    document: DisNoteDocument;
  }): Promise<StoredDocument> {
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
    const session = this.client.startSession();
    try {
      await session.withTransaction(async () => {
        await this.collections.documents.insertOne(stored, { session });
        await this.collections.revisions.insertOne(
          this.revision(input.document, 1, input.actor, ts),
          { session },
        );
      });
      return stored;
    } finally {
      await session.endSession();
    }
  }

  async getById(id: string): Promise<StoredDocument | null> {
    return this.collections.documents.findOne({ id });
  }

  async getPublishedBySlug(query: { slug: string; locale: string }): Promise<PublishedDocument | null> {
    const stored = await this.collections.documents.findOne({
      slug: query.slug,
      locale: query.locale,
      status: "published",
    });
    if (stored?.publishedRevision === undefined) return null;
    const revision = await this.collections.revisions.findOne({
      documentId: stored.id,
      revision: stored.publishedRevision,
    });
    return revision ? { stored, revision } : null;
  }

  async saveDraft(input: SaveDraftInput): Promise<SaveDraftResult> {
    const previouslySaved = await this.collections.idempotency.findOne({ key: input.idempotencyKey });
    if (previouslySaved) return { ok: true, revision: previouslySaved.revision };

    const session = this.client.startSession();
    try {
      let result: SaveDraftResult = { ok: false, reason: "not-found" };
      await session.withTransaction(async () => {
        const duplicate = await this.collections.idempotency.findOne(
          { key: input.idempotencyKey },
          { session },
        );
        if (duplicate) {
          result = { ok: true, revision: duplicate.revision };
          return;
        }

        const ts = this.now();
        const updated = await this.collections.documents.findOneAndUpdate(
          { id: input.documentId, currentRevision: input.expectedRevision },
          {
            $inc: { currentRevision: 1 },
            $set: {
              schemaVersion: input.document.schemaVersion,
              updatedAt: ts,
            },
          },
          { returnDocument: "after", session },
        );
        if (!updated) {
          const current = await this.collections.documents.findOne(
            { id: input.documentId },
            { session },
          );
          result = current
            ? { ok: false, reason: "revision-conflict", currentRevision: current.currentRevision }
            : { ok: false, reason: "not-found" };
          return;
        }

        const nextRevision = updated.currentRevision;
        await this.collections.revisions.insertOne(
          this.revision(input.document, nextRevision, input.actor, ts),
          { session },
        );
        await this.collections.idempotency.insertOne(
          {
            key: input.idempotencyKey,
            documentId: input.documentId,
            revision: nextRevision,
            createdAt: ts,
          },
          { session },
        );
        result = { ok: true, revision: nextRevision };
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  async publish(input: PublishDocumentInput): Promise<PublishedDocument> {
    const session = this.client.startSession();
    try {
      let published: PublishedDocument | undefined;
      await session.withTransaction(async () => {
        const revision = await this.collections.revisions.findOne(
          { documentId: input.documentId, revision: input.revision },
          { session },
        );
        if (!revision) {
          throw new Error(`Revision ${input.revision} not found for ${input.documentId}.`);
        }
        const stored = await this.collections.documents.findOneAndUpdate(
          { id: input.documentId },
          {
            $set: {
              status: "published",
              publishedRevision: input.revision,
              updatedAt: this.now(),
            },
          },
          { returnDocument: "after", session },
        );
        if (!stored) throw new Error(`Document ${input.documentId} not found.`);
        published = { stored, revision };
      });
      if (!published) throw new Error(`Failed to publish document ${input.documentId}.`);
      return published;
    } finally {
      await session.endSession();
    }
  }

  async unpublish(input: UnpublishDocumentInput): Promise<void> {
    const result = await this.collections.documents.updateOne(
      { id: input.documentId },
      {
        $set: { status: "draft", updatedAt: this.now() },
        $unset: { publishedRevision: "" },
      },
    );
    if (result.matchedCount === 0) throw new Error(`Document ${input.documentId} not found.`);
  }

  async archive(input: ArchiveDocumentInput): Promise<void> {
    const result = await this.collections.documents.updateOne(
      { id: input.documentId },
      { $set: { status: "archived", updatedAt: this.now() } },
    );
    if (result.matchedCount === 0) throw new Error(`Document ${input.documentId} not found.`);
  }

  async listRevisions(documentId: string): Promise<DocumentRevisionSummary[]> {
    const list = await this.collections.revisions
      .find({ documentId })
      .sort({ revision: -1 })
      .toArray();
    return list.map((revision) => ({
      documentId: revision.documentId,
      revision: revision.revision,
      checksum: revision.checksum,
      createdBy: revision.createdBy,
      createdAt: revision.createdAt,
      source: revision.source,
    }));
  }

  async getRevision(documentId: string, revision: number): Promise<DocumentRevision | null> {
    return this.collections.revisions.findOne({ documentId, revision });
  }

  private revision(
    document: DisNoteDocument,
    revision: number,
    actor: string,
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
      source: "editor",
    };
  }
}
