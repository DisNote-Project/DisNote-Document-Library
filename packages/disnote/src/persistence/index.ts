export const REVISION_STORAGE = { STORE: "snapshots", VERSION: 1, ERROR: "revision-storage-failed", INVALID: "invalid-revision-write" } as const;
/** Durable browser reference for DatabaseRepository, WorkspaceRepository and CommentRepository. */
export class IndexedDBRevisionRepository<T extends { revision: number }> {
  private readonly database: Promise<IDBDatabase>;
  constructor(name: string, private readonly keyOf: (snapshot: T) => string, factory: IDBFactory = indexedDB, indexes: { name: string; keyPath: string | string[]; unique: boolean }[] = []) {
    this.database = new Promise((resolve, reject) => {
      const request = factory.open(name, REVISION_STORAGE.VERSION);
      request.onupgradeneeded = () => { const store = request.result.createObjectStore(REVISION_STORAGE.STORE); for (const index of indexes) store.createIndex(index.name, index.keyPath, { unique: index.unique }); };
      request.onerror = request.onblocked = () => reject(new Error(REVISION_STORAGE.ERROR));
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    });
  }
  async read(id: string): Promise<T | null> {
    const database = await this.database;
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(REVISION_STORAGE.STORE, "readonly"), request = transaction.objectStore(REVISION_STORAGE.STORE).get(id);
      request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(new Error(REVISION_STORAGE.ERROR));
    });
  }
  async readIndex(index: string, key: IDBValidKey): Promise<T | null> {
    const database = await this.database;
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(REVISION_STORAGE.STORE, "readonly"), request = transaction.objectStore(REVISION_STORAGE.STORE).index(index).get(key);
      request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(new Error(REVISION_STORAGE.ERROR));
    });
  }
  async write(snapshot: T, expectedRevision: number | null): Promise<boolean> {
    if (!Number.isInteger(snapshot.revision) || snapshot.revision !== (expectedRevision ?? 0) + 1) throw new Error(REVISION_STORAGE.INVALID);
    const database = await this.database, id = this.keyOf(snapshot);
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(REVISION_STORAGE.STORE, "readwrite"), store = transaction.objectStore(REVISION_STORAGE.STORE), request = store.get(id);
      let written = false;
      request.onsuccess = () => {
        const current = request.result as T | undefined;
        if (expectedRevision === null ? !!current : current?.revision !== expectedRevision) return;
        store.put(snapshot, id); written = true;
      };
      transaction.oncomplete = () => resolve(written); transaction.onabort = () => transaction.error?.name === "ConstraintError" ? resolve(false) : reject(new Error(REVISION_STORAGE.ERROR));
    });
  }
  async close(): Promise<void> { (await this.database).close(); }
  async clear(): Promise<void> {
    const database = await this.database;
    return new Promise((resolve, reject) => { const transaction = database.transaction(REVISION_STORAGE.STORE, "readwrite"); transaction.objectStore(REVISION_STORAGE.STORE).clear(); transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(new Error(REVISION_STORAGE.ERROR)); });
  }
}
