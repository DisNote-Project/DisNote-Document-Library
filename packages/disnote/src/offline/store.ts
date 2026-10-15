import { OFFLINE_CONSTANTS, type OfflineDocument, type OfflineStore } from "./model.js";
export class InMemoryOfflineStore implements OfflineStore {
  private readonly documents = new Map<string, OfflineDocument>();
  async read(id: string): Promise<OfflineDocument | null> { return structuredClone(this.documents.get(id) ?? null); }
  async mutate(id: string, change: (value: OfflineDocument | null) => OfflineDocument): Promise<OfflineDocument> {
    const next = change(structuredClone(this.documents.get(id) ?? null));
    this.documents.set(id, structuredClone(next)); return structuredClone(next);
  }
  async clear(): Promise<void> { this.documents.clear(); }
}
/** A separate name must be supplied per authenticated account/workspace scope. */
export class IndexedDBOfflineStore implements OfflineStore {
  private readonly database: Promise<IDBDatabase>;
  constructor(name: string, factory: IDBFactory = indexedDB) {
    this.database = new Promise((resolve, reject) => {
      const request = factory.open(name, OFFLINE_CONSTANTS.VERSION);
      request.onupgradeneeded = () => { request.result.createObjectStore(OFFLINE_CONSTANTS.STORE, { keyPath: "id" }); };
      request.onerror = () => reject(new Error(OFFLINE_CONSTANTS.ERROR));
      request.onblocked = () => reject(new Error(OFFLINE_CONSTANTS.ERROR));
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    });
  }
  async read(id: string): Promise<OfflineDocument | null> {
    const db = await this.database;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OFFLINE_CONSTANTS.STORE, "readonly");
      const request = transaction.objectStore(OFFLINE_CONSTANTS.STORE).get(id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(new Error(OFFLINE_CONSTANTS.ERROR));
    });
  }
  async mutate(id: string, change: (value: OfflineDocument | null) => OfflineDocument): Promise<OfflineDocument> {
    const db = await this.database;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OFFLINE_CONSTANTS.STORE, "readwrite");
      const store = transaction.objectStore(OFFLINE_CONSTANTS.STORE), request = store.get(id);
      let next: OfflineDocument;
      transaction.oncomplete = () => resolve(structuredClone(next));
      transaction.onabort = transaction.onerror = () => reject(new Error(OFFLINE_CONSTANTS.ERROR));
      request.onsuccess = () => {
        try { next = change(request.result ?? null); if (next.id !== id) throw new Error(OFFLINE_CONSTANTS.INVALID); store.put(next); }
        catch (error) { transaction.abort(); reject(error); }
      };
    });
  }
  async clear(): Promise<void> {
    const db = await this.database;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OFFLINE_CONSTANTS.STORE, "readwrite");
      transaction.objectStore(OFFLINE_CONSTANTS.STORE).clear();
      transaction.oncomplete = () => resolve(); transaction.onabort = transaction.onerror = () => reject(new Error(OFFLINE_CONSTANTS.ERROR));
    });
  }
  async close(): Promise<void> { (await this.database).close(); }
}
