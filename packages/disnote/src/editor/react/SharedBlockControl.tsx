import { useContext, useEffect, useState, type ReactNode } from "react";
import { createDocument, createDefaultRegistry, type DisNoteBlock } from "../../core/index.js";
import { DocumentRenderer } from "../../renderer-react/index.js";
import { WorkspaceViewContext } from "../../workspace/react/context.js";
import type { SharedBlockSource } from "../../workspace/index.js";
import { uiMessages } from "../../ui/messages.js";
import { DisNoteEditor } from "./DisNoteEditor.js";
import { Dialog } from "../../ui/react/Dialog.js";
export function SharedBlockControl({ sourceId, onSelect, locale, canSelect = true }: { sourceId: string; onSelect: (id: string) => void; locale: string; canSelect?: boolean }): ReactNode {
  const provider = useContext(WorkspaceViewContext), m = uiMessages(locale);
  const [sources, setSources] = useState<{ id: string; ownerPageId: string }[]>([]), [source, setSource] = useState<SharedBlockSource | null>(null), [draft, setDraft] = useState<{ blocks: DisNoteBlock[]; revision: number } | null>(null), [error, setError] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true; setSource(null); setDraft(null); setError(false);
    const reload = async () => {
      if (!provider) return;
      try { const list = await provider.sharedSources(), current = sourceId ? await provider.sharedSource(sourceId) : null; if (active) { setSources(list); setSource(current); } }
      catch { if (active) { setSource(null); setError(true); } }
    };
    void reload(); const unsubscribe = provider?.subscribe?.(() => void reload());
    return () => { active = false; unsubscribe?.(); };
  }, [sourceId, provider]);
  const save = async () => {
    if (!provider || !source || !draft) return; setBusy(true); setError(false);
    try { await provider.saveSharedSource({ ...source, blocks: draft.blocks }, draft.revision); setSource(await provider.sharedSource(sourceId)); setDraft(null); }
    catch { setError(true); } finally { setBusy(false); }
  };
  return <section aria-label={m.syncedBlock}><label>{m.source}<select disabled={!canSelect} value={sourceId} onChange={e => { if (canSelect) onSelect(e.target.value); }}><option value="" />{sources.map(item => <option key={item.id} value={item.id}>{item.id} · {item.ownerPageId}</option>)}</select></label>
    {error && <p role="alert">{m.failed}</p>}
    {source && <><DocumentRenderer document={createDocument({ id: source.id, blocks: source.blocks })} registry={createDefaultRegistry()} locale={locale} />{provider?.canEditSharedSource?.(source.id) && <button type="button" disabled={busy} onClick={() => setDraft({ blocks: source.blocks, revision: source.revision })}>{m.editSource}</button>}</>}
    {source && draft && <Dialog title={m.editSource} onClose={() => { if (!busy) setDraft(null); }}><DisNoteEditor key={source.id} initialDocument={createDocument({ id: source.id, blocks: draft.blocks })} locale={locale} onDocumentChange={document => setDraft(current => current ? { ...current, blocks: document.blocks } : null)} /><button type="button" disabled={busy} onClick={() => void save()}>{m.save}</button><button type="button" disabled={busy} onClick={() => setDraft(null)}>{m.cancel}</button>{error && <p role="alert">{m.failed}</p>}</Dialog>}
  </section>;
}
