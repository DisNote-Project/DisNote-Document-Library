import type { BlockRegistry } from "../core/index.js";
import {
  RevisionDocumentRepository,
  type DocumentStateRepository,
  type DocumentStoreState,
} from "../storage/revision-repository.js";

export const MONGO_DOCUMENT_STATE_INDEXES = {
  ID: "disnote_document_state_id",
  SLUG_LOCALE: "disnote_document_state_slug_locale",
} as const;

export interface MongoWriteResult {
  acknowledged?: boolean;
  matchedCount?: number;
}

/** Minimal structural port implemented by a MongoDB Collection. */
export interface MongoDocumentStateCollection {
  createIndex(keys: Record<string, 1 | -1>, options?: { unique?: boolean; name?: string }): Promise<unknown>;
  findOne(filter: Record<string, unknown>): Promise<unknown | null>;
  insertOne(document: Record<string, unknown>): Promise<unknown>;
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<MongoWriteResult>;
}

interface MongoDocumentStateRecord {
  id: string;
  revision: number;
  slug: string;
  locale: string;
  state: DocumentStoreState;
}

export class MongoDocumentStateRepository implements DocumentStateRepository {
  constructor(private readonly collection: MongoDocumentStateCollection) {}

  async initialize(): Promise<void> {
    await Promise.all([
      this.collection.createIndex({ id: 1 }, { unique: true, name: MONGO_DOCUMENT_STATE_INDEXES.ID }),
      this.collection.createIndex(
        { slug: 1, locale: 1 },
        { unique: true, name: MONGO_DOCUMENT_STATE_INDEXES.SLUG_LOCALE },
      ),
    ]);
  }

  async read(id: string): Promise<DocumentStoreState | null> {
    return stateFromRecord(await this.collection.findOne({ id }));
  }

  async findBySlug(query: { slug: string; locale: string }): Promise<DocumentStoreState | null> {
    return stateFromRecord(await this.collection.findOne(query));
  }

  async write(state: DocumentStoreState, expectedRevision: number | null): Promise<boolean> {
    const record = toRecord(state);
    if (expectedRevision === null) {
      try {
        await this.collection.insertOne(record as unknown as Record<string, unknown>);
        return true;
      } catch (error) {
        if (isDuplicateKey(error)) return false;
        throw error;
      }
    }
    const result = await this.collection.updateOne(
      { id: state.id, revision: expectedRevision },
      { $set: record },
    );
    return result.matchedCount === 1;
  }
}

export interface CreateMongoDocumentRepositoryOptions {
  collection: MongoDocumentStateCollection;
  registry: BlockRegistry;
  now?: () => string;
}

export function createMongoDocumentRepository(options: CreateMongoDocumentRepositoryOptions) {
  const states = new MongoDocumentStateRepository(options.collection);
  return { states, documents: new RevisionDocumentRepository(states, options.registry, options.now) };
}

function toRecord(state: DocumentStoreState): MongoDocumentStateRecord {
  return {
    id: state.id,
    revision: state.revision,
    slug: state.stored.slug,
    locale: state.stored.locale,
    state: structuredClone(state),
  };
}

function stateFromRecord(value: unknown): DocumentStoreState | null {
  if (!value || typeof value !== "object" || !("state" in value)) return null;
  return structuredClone((value as { state: DocumentStoreState }).state);
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000;
}
