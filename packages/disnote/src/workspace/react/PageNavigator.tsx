import { useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createDocument, type DisNoteDocument } from "../../core/index.js";
import { instantiateTemplate } from "../templates.js";
import type { WorkspacePage } from "../model.js";
import { WorkspaceViewContext, type WorkspacePageViewProvider } from "./context.js";
import { uiMessages } from "../../ui/messages.js";
export function PageNavigator({ provider: supplied, locale = "en", onOpen, canManage = false, templates = [] }: { provider?: WorkspacePageViewProvider; locale?: string; onOpen: (id: string) => void; canManage?: boolean; templates?: DisNoteDocument[] }): ReactNode {
  const context = useContext(WorkspaceViewContext), provider = supplied ?? context, m = uiMessages(locale);
  const [pages, setPages] = useState<WorkspacePage[]>([]), [trash, setTrash] = useState(false), [title, setTitle] = useState(""), [template, setTemplate] = useState(""), [error, setError] = useState(false), [busy, setBusy] = useState(false);
  const reload = useCallback(async () => { if (provider) setPages(await provider.pages(trash)); }, [provider, trash]);
  useEffect(() => { let active = true; setPages([]); void provider?.pages(trash).then(next => { if (active) setPages(next); }, () => { if (active) setError(true); }); const unsubscribe = provider?.subscribe?.(() => void reload().catch(() => setError(true))); return () => { active = false; unsubscribe?.(); }; }, [provider, trash, reload]);
  const run = async (work: () => Promise<void>) => { setBusy(true); setError(false); try { await work(); await reload(); } catch { setError(true); } finally { setBusy(false); } };
  if (!provider) return <p>{m.unavailable}</p>;
  const branch = (parentId: string | null, ancestors: Set<string>): ReactNode => <ul>{pages.filter(page => page.parentId === parentId || (parentId === null && !pages.some(parent => parent.id === page.parentId))).map(page => <li key={page.id}>
    <button type="button" onClick={() => onOpen(page.id)}>{page.document.metadata.title || page.id}</button>
    {canManage && <><button type="button" disabled={busy} onClick={() => void run(() => trash ? provider.restore(page.id) : provider.trash(page.id))}>{trash ? m.restore : m.remove}</button>{!trash && <select aria-label={m.breadcrumb} value={page.parentId ?? ""} disabled={busy} onChange={e => void run(() => provider.move(page.id, e.target.value || null))}><option value="">{m.ungrouped}</option>{pages.filter(p => p.id !== page.id).map(p => <option key={p.id} value={p.id}>{p.document.metadata.title || p.id}</option>)}</select>}</>}
    {!ancestors.has(page.id) && branch(page.id, new Set(ancestors).add(page.id))}
  </li>)}</ul>;
  return <nav aria-label={m.pages}>{error && <p role="alert">{m.failed}</p>}<button type="button" onClick={() => setTrash(!trash)}>{trash ? m.pages : m.trash}</button>{branch(null, new Set())}
    {canManage && !trash && <form onSubmit={event => { event.preventDefault(); void run(async () => { const source = templates.find(t => t.id === template); const document = source ? instantiateTemplate(source, { title }) : createDocument({ metadata: { title }, blocks: [] }); await provider.create(document, null); setTitle(""); }); }}><input aria-label={m.title} value={title} onChange={event => setTitle(event.target.value)} /><select aria-label={m.template} value={template} onChange={event => setTemplate(event.target.value)}><option value="">{m.ungrouped}</option>{templates.map(t => <option key={t.id} value={t.id}>{t.metadata.title || t.id}</option>)}</select><button type="submit" disabled={busy || !title.trim()}>{m.addPage}</button></form>}
  </nav>;
}
