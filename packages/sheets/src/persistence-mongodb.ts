import type { WorkbookStateRepository, WorkbookStoreState } from "./persistence.js";

export const MONGO_WORKBOOK_INDEXES = { ID: "disnote_workbook_id" } as const;

export interface MongoWorkbookCollection {
  createIndex(keys: Record<string, 1 | -1>, options?: { unique?: boolean; name?: string }): Promise<unknown>;
  findOne(filter: Record<string, unknown>): Promise<unknown | null>;
  insertOne(document: Record<string, unknown>): Promise<unknown>;
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ matchedCount?: number }>;
}

export class MongoWorkbookStateRepository implements WorkbookStateRepository {
  constructor(private readonly collection: MongoWorkbookCollection) {}

  async initialize(): Promise<void> { await this.collection.createIndex({ id: 1 }, { unique: true, name: MONGO_WORKBOOK_INDEXES.ID }); }

  async read(id: string): Promise<WorkbookStoreState | null> {
    const record = await this.collection.findOne({ id });
    return record && typeof record === "object" && "state" in record ? structuredClone((record as { state: WorkbookStoreState }).state) : null;
  }

  async write(state: WorkbookStoreState, expectedRevision: number | null): Promise<boolean> {
    const record = { id: state.id, revision: state.revision, state: structuredClone(state) };
    if (expectedRevision === null) {
      try { await this.collection.insertOne(record); return true; }
      catch (error) { if (isDuplicateKey(error)) return false; throw error; }
    }
    const result = await this.collection.updateOne({ id: state.id, revision: expectedRevision }, { $set: record });
    return result.matchedCount === 1;
  }
}

function isDuplicateKey(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000; }
