import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { checksum, type DisNoteDocument } from "../../core/index.js";
import type { CommentAnchor } from "../../comments/model.js";
import type { DocumentRevisionSummary, SaveDraftResult } from "../../storage/index.js";
import { HistoryPanel } from "../../storage/react/HistoryPanel.js";
import { CommentPanel, type CommentPanelProvider } from "../../comments/react/CommentPanel.js";
import { DocumentView } from "../../react/view.js";
import { useDatabaseMessages } from "./customization.js";
import type { RecordPageState } from "../record-pages.js";
import type { CellValue } from "../model.js";
import type { DatabaseViewProvider } from "./context.js";
import { RecordProperties } from "./RecordProperties.js";
import { RecordTaskSettings } from "./RecordTaskSettings.js";
const Editor = lazy(() => import("../../react/index.js").then(module => ({ default: module.DocumentEditor })));
export interface RecordPageProvider {
  saveProperties?(databaseId: string, recordId: string, values: Record<string, CellValue>, revision: number): Promise<void>;
  open(databaseId: string, recordId: string): Promise<RecordPageState>;
  save(databaseId: string, recordId: string, document: DisNoteDocument, revision: number, key: string): Promise<SaveDraftResult>;
  history(databaseId: string, recordId: string): Promise<DocumentRevisionSummary[]>;
  revision(databaseId: string, recordId: string, revision: number): Promise<DisNoteDocument>;
  restore(databaseId: string, recordId: string, revision: number, expectedRevision: number, key: string): Promise<SaveDraftResult>;
  comments?: CommentPanelProvider;
}
export function RecordPageDialog({ databaseId, recordId, provider, databaseProvider, locale, readonly, onClose, onOpenRecord }: { databaseId: string; recordId: string; provider: RecordPageProvider; databaseProvider?: DatabaseViewProvider; locale?: string; readonly?: boolean; onClose(): void; onOpenRecord?(id: string): void }) {
  const root = useRef<HTMLDialogElement>(null), m = useDatabaseMessages(locale);
  const [state, setState] = useState<RecordPageState | null>(null), [draft, setDraft] = useState<DisNoteDocument | null>(null), [failed, setFailed] = useState(false), [busy, setBusy] = useState(false);
  const [anchor, setAnchor] = useState<CommentAnchor>({ type: "document" });
  const [taskOpen, setTaskOpen] = useState(false), [commentBusy, setCommentBusy] = useState(false);
  const pending = busy || commentBusy;
  const load = async () => { const next = await provider.open(databaseId, recordId); setState(next); setDraft(next.document); setAnchor({ type: "document" }); };
  useEffect(() => { const previous = document.activeElement; root.current?.showModal(); return () => { root.current?.close(); if (previous instanceof HTMLElement) previous.focus(); }; }, []);
  useEffect(() => { let active = true; void provider.open(databaseId, recordId).then(next => { if (active) { setState(next); setDraft(next.document); } }, () => { if (active) setFailed(true); }); return () => { active = false; }; }, [databaseId, recordId, provider]);
  const history = useMemo(() => ({
    list: () => provider.history(databaseId, recordId), revision: (_id: string, revision: number) => provider.revision(databaseId, recordId, revision),
    restore: (_id: string, revision: number, expected: number, key: string) => provider.restore(databaseId, recordId, revision, expected, key),
  }), [databaseId, recordId, provider]);
  return <dialog ref={root} className="disnote-db disnote-record-page" aria-label={m.record} onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
    <header><h2>{state?.document.metadata.title ?? m.record}</h2><button type="button" disabled={pending} onClick={onClose}>{m.close}</button></header>
    {failed && <p role="alert">{m.conflict}</p>}
    {!state && !failed && <p role="status">{m.loading}</p>}
    {state && draft && <>
      <dl>{state.properties.map(property => <div key={property.id}><dt>{property.name}</dt><dd>{Array.isArray(state.record.values[property.id]) ? (state.record.values[property.id] as string[]).join(", ") : String(state.record.values[property.id] ?? "")}</dd></div>)}</dl>
      {databaseProvider && <details open={taskOpen} onToggle={event => setTaskOpen(event.currentTarget.open)}><summary>{m.taskLinks}</summary>{taskOpen && <RecordTaskSettings key={recordId} databaseId={databaseId} state={state} provider={databaseProvider} locale={locale} onOpenRecord={onOpenRecord} save={!readonly && databaseProvider.mutate ? async (changes, revision) => { await databaseProvider.mutate!(databaseId, [{ kind: "task", recordId, ...changes }], revision); const next = await provider.open(databaseId, recordId); setState(current => current ? { ...next, document: current.document, revision: current.revision } : next); setTaskOpen(false); } : undefined} />}</details>}
      {!readonly && provider.saveProperties && <details><summary>{m.properties}</summary><RecordProperties provider={databaseProvider} key={state.databaseRevision} state={state} locale={locale} save={async (values, revision) => { if (Object.keys(values).length) await provider.saveProperties!(databaseId, recordId, values, revision); const next = await provider.open(databaseId, recordId); setState(current => current ? { ...next, document: current.document, revision: current.revision } : next); }} /></details>}
      {readonly ? <DocumentView document={state.document} locale={locale} /> : <Suspense fallback={<p role="status">{m.loading}</p>}><Editor key={`${draft.id}:${state.revision}`} initialDocument={state.document} locale={locale} onChange={setDraft} onCommentAnchorChange={setAnchor} /></Suspense>}
      {!readonly && <button type="button" disabled={pending} onClick={() => { setBusy(true); setFailed(false); void provider.save(databaseId, recordId, draft, state.revision, crypto.randomUUID()).then(async result => { if (!result.ok) setFailed(true); else await load(); }).catch(() => setFailed(true)).finally(() => setBusy(false)); }}>{m.save}</button>}
      {provider.comments && <>{!readonly && checksum(draft) !== checksum(state.document) && <p role="status">{m.saveBeforeComment}</p>}<CommentPanel documentId={draft.id} revision={state.revision} provider={provider.comments} anchor={anchor} onClearAnchor={() => setAnchor({ type: "document" })} locale={locale} canComment={!readonly && !busy && checksum(draft) === checksum(state.document)} canResolve={!readonly && !busy} onBusyChange={setCommentBusy} /></>}
      {state.revision > 0 && <HistoryPanel documentId={draft.id} currentRevision={state.revision} provider={history} locale={locale} canRestore={!readonly && !pending} onRestored={() => void load().catch(() => setFailed(true))} renderPreview={document => <DocumentView document={document} locale={locale} />} />}
    </>}
  </dialog>;
}
