import React, { useEffect, useState } from "react";
import type { DisNoteDocument } from "@disnote/core";
import { DatabaseProvider, DatabaseView, type DatabaseViewKind } from "@disnote/core/database/react";
import { CommentPanel } from "@disnote/core/comments/react";
import { DisNoteEditor, OfflineEditor } from "@disnote/core/editor/react";
import { DocumentRenderer } from "@disnote/core/renderer/react";
import { WorkspaceProvider, PageNavigator } from "@disnote/core/workspace/react";
import { HistoryPanel } from "@disnote/core/storage/react";
import { uiMessages } from "@disnote/core/ui";
import { createParityRuntime, PARITY_LAB, parityRegistry, type ParityRuntime } from "./parity/runtime.js";
export function ParityLab(): JSX.Element {
  const [selectedPage, setSelectedPage] = useState<DisNoteDocument | null>(null);
  const [locale, setLocale] = useState("vi"), [view, setView] = useState<DatabaseViewKind>("table"), [runtime, setRuntime] = useState<ParityRuntime | null>(null), [failed, setFailed] = useState(false), [remote, setRemote] = useState(false), [latest, setLatest] = useState<{ document: DisNoteDocument; revision: number } | null>(null), [consumer, setConsumer] = useState<DisNoteDocument | null>(null), [resolved, setResolved] = useState<DisNoteDocument | null>(null);
  const m = uiMessages(locale);
  useEffect(() => {
    let active = true, created: ParityRuntime | null = null, unsubscribe: (() => void) | undefined;
    void createParityRuntime(locale).then(async value => {
      created = value;
      if (!active) { value.dispose(); return; }
      const updateShared = () => { void value.resolveSharedDocument().then(document => { if (active) setResolved(document); }, () => { if (active) setFailed(true); }); };
      unsubscribe = value.workspace.subscribe?.(updateShared); updateShared();
      const [latest, consumer] = await Promise.all([value.latestDocument(), value.consumerDocument()]);
      if (active) { setRuntime(value); setLatest(latest); setConsumer(consumer); }
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; unsubscribe?.(); created?.dispose(); };
  }, []);
  const refresh = () => { if (runtime) void runtime.latestDocument().then(setLatest, () => setFailed(true)); };
  const openPage = (id: string) => { if (runtime) void runtime.workspace.pages(false).then(pages => setSelectedPage(pages.find(page => page.id === id)?.document ?? null), () => setFailed(true)); };
  const reconnect = async () => { if (!runtime) return; const available = !remote; setRemote(available); runtime.setRemoteAvailable(available); if (available) { try { await runtime.offline.flush(PARITY_LAB.DOCUMENT); refresh(); } catch { setFailed(true); } } };
  return <main style={{ padding: 16, maxWidth: 1100, margin: "auto" }}>
    <button type="button" onClick={() => setLocale(locale === "vi" ? "en" : "vi")}>{locale === "vi" ? "en" : "vi"}</button>
    {failed && <p role="alert">{m.failed}</p>}
    {runtime && <>
      <section data-testid="parity-database"><nav>{(["table", "board", "list", "gallery", "calendar", "timeline", "map"] as const).map(kind => <button key={kind} type="button" onClick={() => setView(kind)}>{m[kind]}</button>)}</nav><DatabaseProvider provider={runtime.database}><DatabaseView databaseId={PARITY_LAB.DATABASE} view={view} locale={locale} groupPropertyId="status" datePropertyId="date" /></DatabaseProvider></section>
      <section data-testid="parity-comments"><CommentPanel documentId={PARITY_LAB.DOCUMENT} revision={latest?.revision ?? 1} provider={runtime.comments} locale={locale} /></section>
      {latest && <section data-testid="parity-offline"><button type="button" onClick={() => void reconnect()}>{remote ? m.offline : m.online}</button><OfflineEditor controller={runtime.offline} initialDocument={latest.document} revision={latest.revision} locale={locale} /></section>}
      <section data-testid="parity-collaboration"><DisNoteEditor initialDocument={latest?.document ?? consumer!} locale={locale} collaboration={{ fragment: runtime.collaboration.fragment, provider: runtime.collaboration, user: { name: PARITY_LAB.ACTOR, color: "#0d9488" } }} /></section>
      <WorkspaceProvider provider={runtime.workspace}><section data-testid="parity-pages"><PageNavigator locale={locale} onOpen={openPage} canManage /></section>{selectedPage && <section data-testid="parity-selected-page"><DocumentRenderer document={selectedPage} registry={parityRegistry} locale={locale} /></section>}{consumer && <section data-testid="parity-shared-editor"><DisNoteEditor initialDocument={consumer} locale={locale} /></section>}{resolved && <section data-testid="parity-shared-preview"><DocumentRenderer document={resolved} registry={parityRegistry} locale={locale} /></section>}</WorkspaceProvider>
      {latest && <section data-testid="parity-history"><HistoryPanel documentId={PARITY_LAB.DOCUMENT} currentRevision={latest.revision} provider={runtime.history} locale={locale} canRestore onRestored={refresh} renderPreview={document => <DocumentRenderer document={document} registry={parityRegistry} locale={locale} />} /></section>}
    </>}
  </main>;
}
