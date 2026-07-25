import type { CollabSnapshot, CollabUpdate, UpdatePersistence } from "../contracts.js";

export interface UpdateStoreOptions {
  now?: () => string;
  /** Compact once the update count reaches this threshold. Default 100. */
  compactThreshold?: number;
  /** Merge a set of update payloads into one snapshot payload. */
  merge?: (updates: Uint8Array[]) => Uint8Array;
}

function defaultMerge(updates: Uint8Array[]): Uint8Array {
  const total = updates.reduce((n, u) => n + u.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const u of updates) {
    out.set(u, offset);
    offset += u.length;
  }
  return out;
}

/**
 * CRDT-agnostic update log with compaction. Mirrors the guideline's
 * `document_collab_updates` / `document_collab_snapshots` design (section 23.4)
 * without binding to Yjs, so the persistence + compaction logic is testable.
 */
export class InMemoryUpdateStore implements UpdatePersistence {
  private readonly updates = new Map<string, CollabUpdate[]>();
  private readonly snapshots = new Map<string, CollabSnapshot>();
  private readonly seq = new Map<string, number>();
  private readonly now: () => string;
  private readonly threshold: number;
  private readonly merge: (updates: Uint8Array[]) => Uint8Array;

  constructor(options: UpdateStoreOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.threshold = options.compactThreshold ?? 100;
    this.merge = options.merge ?? defaultMerge;
  }

  async appendUpdate(documentId: string, update: Uint8Array): Promise<void> {
    const list = this.updates.get(documentId) ?? [];
    const sequence = (this.seq.get(documentId) ?? 0) + 1;
    this.seq.set(documentId, sequence);
    list.push({ documentId, sequence, update, createdAt: this.now() });
    this.updates.set(documentId, list);
    if (list.length >= this.threshold) await this.compact(documentId);
  }

  async loadUpdates(documentId: string): Promise<Uint8Array[]> {
    const snapshot = this.snapshots.get(documentId);
    const updates = (this.updates.get(documentId) ?? []).map((u) => u.update);
    return snapshot ? [snapshot.snapshot, ...updates] : updates;
  }

  async compact(documentId: string): Promise<void> {
    const payloads = await this.loadUpdates(documentId);
    if (payloads.length === 0) return;
    this.snapshots.set(documentId, {
      documentId,
      stateVector: new Uint8Array([payloads.length]),
      snapshot: this.merge(payloads),
      createdAt: this.now(),
    });
    this.updates.set(documentId, []); // updates folded into the snapshot
  }

  updateCount(documentId: string): number {
    return (this.updates.get(documentId) ?? []).length;
  }

  hasSnapshot(documentId: string): boolean {
    return this.snapshots.has(documentId);
  }
}
