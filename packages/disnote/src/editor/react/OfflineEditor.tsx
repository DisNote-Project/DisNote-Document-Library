import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DisNoteDocument } from "../../core/index.js";
import type { OfflineDocumentController, OfflineDocument } from "../../offline/index.js";
import { uiMessages } from "../../ui/messages.js";
import { DisNoteEditor } from "./DisNoteEditor.js";
export function OfflineEditor({ initialDocument, revision, controller, locale = "en", onDocumentChange }: { initialDocument: DisNoteDocument; revision: number; controller: OfflineDocumentController; locale?: string; onDocumentChange?: (document: DisNoteDocument) => void }): ReactNode {
  const m = uiMessages(locale), [initial, setInitial] = useState<DisNoteDocument | null>(null), [state, setState] = useState<OfflineDocument | null>(null), [status, setStatus] = useState(m.loading);
  const pending = useRef(Promise.resolve()), timer = useRef<ReturnType<typeof setTimeout> | null>(null), generation = useRef(0);
  const storageFailed = useRef(false);
  useEffect(() => {
    const current = ++generation.current;
    const active = () => generation.current === current;
    setInitial(null); setState(null); setStatus(m.loading); storageFailed.current = false;
    const flush = async () => {
      if (!navigator.onLine) { if (active()) setStatus(m.offline); return; }
      if (storageFailed.current) { if (active()) setStatus(m.failed); return; }
      if (active()) setStatus(m.syncing);
      try { await pending.current; if (storageFailed.current) { if (active()) setStatus(m.failed); return; } const saved = await controller.flush(initialDocument.id); if (active()) { setState(saved); setStatus(saved.conflict !== undefined ? m.conflict : m.synced); } }
      catch { if (active()) setStatus(m.offline); }
    };
    void controller.download(initialDocument, revision).then(value => { if (active()) { setInitial(value.document); setState(value); void flush(); } }, () => { if (active()) setStatus(m.failed); });
    const offline = () => setStatus(m.offline);
    window.addEventListener("online", flush); window.addEventListener("offline", offline);
    return () => { generation.current++; if (timer.current) clearTimeout(timer.current); window.removeEventListener("online", flush); window.removeEventListener("offline", offline); };
  }, [controller, initialDocument.id, revision, locale]);
  const edit = (document: DisNoteDocument) => {
    const current = generation.current, active = () => generation.current === current;
    onDocumentChange?.(document);
    pending.current = pending.current.then(async () => { const saved = await controller.edit(document); if (active()) { storageFailed.current = false; setState(saved); setStatus(navigator.onLine ? m.syncing : m.offline); } }).catch(() => { if (active()) { storageFailed.current = true; setStatus(m.failed); } });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (navigator.onLine) void pending.current.then(async () => { if (!storageFailed.current) { const saved = await controller.flush(document.id); if (active()) { setState(saved); setStatus(saved.conflict !== undefined ? m.conflict : m.synced); } } }).catch(() => { if (active()) setStatus(m.offline); }); }, 300);
  };
  return <section><p role="status" data-pending={state?.pending.length ?? 0}>{status}</p>{initial && <DisNoteEditor key={initial.id} initialDocument={initial} locale={locale} onDocumentChange={edit} />}</section>;
}
