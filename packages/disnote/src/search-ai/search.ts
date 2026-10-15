import type { DocumentSearchProjection } from "./projection.js";
export const SEARCH_ERRORS = { INVALID: "invalid-document-search", DENIED: "document-search-denied" } as const;
export interface SearchIndex {
  upsert(projection: DocumentSearchProjection): Promise<void>;
  remove(documentId: string): Promise<void>;
  candidates(query: string): Promise<DocumentSearchProjection[]>;
}
export interface SearchPolicy { canRead(actor: string, documentId: string): Promise<boolean> }
export interface SearchResult { documentId: string; title: string; snippet: string; revision: number; score: number }
export class DocumentSearchService {
  constructor(private readonly index: SearchIndex, private readonly policy: SearchPolicy) {}
  async search(actor: string, query: string, offset = 0, limit = 25): Promise<{ results: SearchResult[]; total: number }> {
    if (query.length > 1000 || !Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error(SEARCH_ERRORS.INVALID);
    const terms = query.toLocaleLowerCase().trim().split(/\s+/u).filter(Boolean);
    if (!terms.length) return { results: [], total: 0 };
    const results: SearchResult[] = [];
    for (const projection of await this.index.candidates(query)) {
      // Filter before ranking, snippets and counts; hidden content cannot affect results.
      if (!await this.policy.canRead(actor, projection.documentId)) continue;
      const title = projection.title.toLocaleLowerCase(), body = projection.plainText.toLocaleLowerCase();
      if (!terms.every(term => title.includes(term) || body.includes(term))) continue;
      const score = terms.reduce((sum, term) => sum + (title.includes(term) ? 10 : 0) + (body.includes(term) ? 1 : 0), 0);
      const index = Math.max(0, body.indexOf(terms[0]!));
      results.push({ documentId: projection.documentId, title: projection.title, snippet: projection.plainText.slice(Math.max(0, index - 50), index + 150), revision: projection.revision, score });
    }
    results.sort((a, b) => b.score - a.score || a.documentId.localeCompare(b.documentId));
    return { results: results.slice(offset, offset + limit), total: results.length };
  }
}
export class InMemorySearchIndex implements SearchIndex {
  private readonly projections = new Map<string, DocumentSearchProjection>();
  async upsert(projection: DocumentSearchProjection): Promise<void> {
    if ((this.projections.get(projection.documentId)?.revision ?? -1) <= projection.revision) this.projections.set(projection.documentId, structuredClone(projection));
  }
  async remove(id: string): Promise<void> { this.projections.delete(id); }
  async candidates(_query: string): Promise<DocumentSearchProjection[]> { return structuredClone([...this.projections.values()]); }
}
