import { useEffect, useState, type ReactNode } from "react";
import type { DisNoteDocument } from "../../core/index.js";
import type { DocumentRevisionSummary } from "../document-repository.js";
import type { HistoryViewProvider } from "../history.js";
import { uiMessages } from "../../ui/messages.js";
export function HistoryPanel({ documentId, currentRevision, provider, renderPreview, locale = "en", canRestore = false, onRestored }: { documentId: string; currentRevision: number; provider: HistoryViewProvider; renderPreview: (document: DisNoteDocument) => ReactNode; locale?: string; canRestore?: boolean; onRestored?: (revision: number) => void }): ReactNode {
  const m = uiMessages(locale), [revisions, setRevisions] = useState<DocumentRevisionSummary[]>([]), [selected, setSelected] = useState<DisNoteDocument | null>(null), [error, setError] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; setSelected(null); setRevisions([]); void provider.list(documentId).then(rows => { if (active) setRevisions(rows); }, () => { if (active) setError(true); }); return () => { active = false; }; }, [documentId, provider, currentRevision]);
  const restore = async (revision: number) => {
    setBusy(true); setError(false);
    try { const result = await provider.restore(documentId, revision, currentRevision, crypto.randomUUID()); if (!result.ok) setError(true); else onRestored?.(result.revision); } catch { setError(true); } finally { setBusy(false); }
  };
  return <aside aria-label={m.history}><h3>{m.history}</h3>{error && <p role="alert">{m.failed}</p>}<ol>{revisions.map(row => <li key={row.revision}><button type="button" onClick={() => void provider.revision(documentId, row.revision).then(setSelected, () => setError(true))}>{row.revision} · {row.createdBy} · {row.createdAt}</button>{canRestore && <button type="button" disabled={busy || row.revision === currentRevision} onClick={() => void restore(row.revision)}>{m.restore}</button>}</li>)}</ol>{selected && renderPreview(selected)}</aside>;
}
