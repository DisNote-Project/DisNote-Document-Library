import { IndexedDBRevisionRepository } from "../../persistence/index.js";
import type { DocumentStateRepository, DocumentStoreState } from "../revision-repository.js";
import type { PublishedSlugQuery } from "../document-repository.js";
const DOCUMENT_INDEX = "slug-locale";
export class IndexedDBDocumentStateRepository extends IndexedDBRevisionRepository<DocumentStoreState> implements DocumentStateRepository {
  constructor(name: string, factory: IDBFactory = indexedDB) { super(name, state => state.id, factory, [{ name: DOCUMENT_INDEX, keyPath: ["stored.slug", "stored.locale"], unique: true }]); }
  findBySlug(query: PublishedSlugQuery): Promise<DocumentStoreState | null> { return this.readIndex(DOCUMENT_INDEX, [query.slug, query.locale]); }
}
