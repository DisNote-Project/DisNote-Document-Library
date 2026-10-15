import type { DatabaseRepository, DatabaseSnapshot } from "./model.js";

/** Reference adapter. Use a transactional database adapter on the server. */
export class InMemoryDatabaseRepository implements DatabaseRepository {
  private readonly snapshots = new Map<string, DatabaseSnapshot>();
  async read(id: string): Promise<DatabaseSnapshot | null> {
    return structuredClone(this.snapshots.get(id) ?? null);
  }
  async write(snapshot: DatabaseSnapshot, expectedRevision: number | null): Promise<boolean> {
    const current = this.snapshots.get(snapshot.id);
    if (expectedRevision === null ? current !== undefined : current?.revision !== expectedRevision) return false;
    this.snapshots.set(snapshot.id, structuredClone(snapshot));
    return true;
  }
}
