import { randomUUID } from "node:crypto";
import type { Collection, Db } from "mongodb";
import { Binary } from "mongodb";
import * as Y from "yjs";
import type { UpdatePersistence } from "@disnote/collaboration-yjs";
import type { CollaborationMetrics } from "./metrics.js";

interface UpdateRecord {
  documentId: string;
  sequence: number;
  update: Binary;
  createdAt: Date;
}

interface SnapshotRecord {
  documentId: string;
  sequence: number;
  snapshot: Binary;
  stateVector: Binary;
  updatedAt: Date;
}

interface CounterRecord {
  documentId: string;
  sequence: number;
}

interface LockRecord {
  documentId: string;
  ownerId: string;
  expiresAt: Date;
}

export interface MongoUpdateStoreOptions {
  compactThreshold?: number;
  lockTtlMs?: number;
  metrics?: CollaborationMetrics;
}

export class MongoUpdateStore implements UpdatePersistence {
  private readonly updates: Collection<UpdateRecord>;
  private readonly snapshots: Collection<SnapshotRecord>;
  private readonly counters: Collection<CounterRecord>;
  private readonly locks: Collection<LockRecord>;
  private readonly threshold: number;
  private readonly lockTtlMs: number;

  constructor(db: Db, private readonly options: MongoUpdateStoreOptions = {}) {
    this.updates = db.collection("collab_updates");
    this.snapshots = db.collection("collab_snapshots");
    this.counters = db.collection("collab_counters");
    this.locks = db.collection("collab_compaction_locks");
    this.threshold = options.compactThreshold ?? 100;
    this.lockTtlMs = options.lockTtlMs ?? 30_000;
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.updates.createIndex({ documentId: 1, sequence: 1 }, { unique: true }),
      this.snapshots.createIndex({ documentId: 1 }, { unique: true }),
      this.counters.createIndex({ documentId: 1 }, { unique: true }),
      this.locks.createIndex({ documentId: 1 }, { unique: true }),
      this.locks.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
  }

  async appendUpdate(documentId: string, update: Uint8Array): Promise<void> {
    const counter = await this.counters.findOneAndUpdate(
      { documentId },
      { $inc: { sequence: 1 } },
      { upsert: true, returnDocument: "after" },
    );
    const sequence = counter?.sequence ?? 1;
    await this.updates.insertOne({
      documentId,
      sequence,
      update: new Binary(Buffer.from(update)),
      createdAt: new Date(),
    });
    const count = await this.updates.countDocuments({ documentId }, { limit: this.threshold });
    if (count >= this.threshold) await this.compact(documentId);
  }

  async loadUpdates(documentId: string): Promise<Uint8Array[]> {
    const snapshot = await this.snapshots.findOne({ documentId });
    const records = await this.updates
      .find({
        documentId,
        sequence: { $gt: snapshot?.sequence ?? 0 },
      })
      .sort({ sequence: 1 })
      .toArray();
    const result = records.map((record) => new Uint8Array(record.update.buffer));
    return snapshot
      ? [new Uint8Array(snapshot.snapshot.buffer), ...result]
      : result;
  }

  async compact(documentId: string): Promise<void> {
    const ownerId = randomUUID();
    if (!(await this.acquireLock(documentId, ownerId))) return;
    try {
      const snapshot = await this.snapshots.findOne({ documentId });
      const records = await this.updates
        .find({ documentId, sequence: { $gt: snapshot?.sequence ?? 0 } })
        .sort({ sequence: 1 })
        .toArray();
      if (records.length === 0) return;
      const inputs = [
        ...(snapshot ? [new Uint8Array(snapshot.snapshot.buffer)] : []),
        ...records.map((record) => new Uint8Array(record.update.buffer)),
      ];
      const merged = Y.mergeUpdates(inputs);
      const sequence = records[records.length - 1]!.sequence;
      await this.snapshots.updateOne(
        { documentId },
        {
          $set: {
            documentId,
            sequence,
            snapshot: new Binary(Buffer.from(merged)),
            stateVector: new Binary(Buffer.from(Y.encodeStateVectorFromUpdate(merged))),
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
      await this.updates.deleteMany({ documentId, sequence: { $lte: sequence } });
      this.options.metrics?.compactionCompleted();
    } catch (error) {
      this.options.metrics?.compactionFailed();
      throw error;
    } finally {
      await this.locks.deleteOne({ documentId, ownerId });
    }
  }

  private async acquireLock(documentId: string, ownerId: string): Promise<boolean> {
    const now = new Date();
    try {
      const lock = await this.locks.findOneAndUpdate(
        {
          documentId,
          $or: [{ expiresAt: { $lte: now } }, { ownerId }],
        },
        {
          $set: {
            documentId,
            ownerId,
            expiresAt: new Date(now.getTime() + this.lockTtlMs),
          },
        },
        { upsert: true, returnDocument: "after" },
      );
      return lock?.ownerId === ownerId;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return false;
      throw error;
    }
  }
}
