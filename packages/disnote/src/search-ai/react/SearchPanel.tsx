import { useEffect, useState, type ReactNode } from "react";
import type { SearchResult } from "../search.js";
import { uiMessages } from "../../ui/messages.js";
export interface SearchPanelProvider { search(query: string, offset: number, limit: number): Promise<{ results: SearchResult[]; total: number }> }
export function SearchPanel({ provider, locale = "en", onOpen }: { provider: SearchPanelProvider; locale?: string; onOpen: (id: string) => void }): ReactNode {
  const m = uiMessages(locale), [query, setQuery] = useState(""), [offset, setOffset] = useState(0), [result, setResult] = useState<{ results: SearchResult[]; total: number }>({ results: [], total: 0 }), [error, setError] = useState(false), [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true; setLoading(true); setError(false);
    const timer = setTimeout(() => { void provider.search(query, offset, 25).then(rows => { if (active) { setResult(rows); setLoading(false); } }, () => { if (active) { setError(true); setLoading(false); setResult({ results: [], total: 0 }); } }); }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [provider, query, offset]);
  return <section aria-label={m.search}><input type="search" aria-label={m.search} value={query} onChange={e => { setQuery(e.target.value); setOffset(0); }} />
    {loading && <p role="status">{m.loading}</p>}{error && <p role="alert">{m.failed}</p>}
    <ul>{result.results.map(row => <li key={row.documentId}><button type="button" onClick={() => onOpen(row.documentId)}>{row.title}</button><p>{row.snippet}</p></li>)}</ul>
    <button type="button" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - 25))}>{m.previous}</button><button type="button" disabled={offset + 25 >= result.total || loading} onClick={() => setOffset(offset + 25)}>{m.next}</button>
  </section>;
}
