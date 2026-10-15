import { useEffect, useRef, useState, type ReactNode } from "react";
import { validateDocument, type DisNoteDocument } from "../../core/index.js";
import { MOBILE_BRIDGE, type MobileEditorCommand } from "../../mobile/bridge.js";
import { DisNoteEditor, type DisNoteEditorHandle } from "./DisNoteEditor.js";
/** Mount this on the trusted HTTPS page passed to NativeDocumentEditor. */
export function MobileEditorBridge({ postMessage }: { postMessage: (message: string) => void }): ReactNode {
  const handle = useRef<DisNoteEditorHandle | null>(null);
  const [initial, setInitial] = useState<{ document: DisNoteDocument; editable: boolean; locale: string } | null>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if ((event.source && event.source !== window) || (event.origin && event.origin !== window.location.origin)) return;
      if (typeof event.data !== "string" || event.data.length > MOBILE_BRIDGE.MAX_BYTES) return;
      try {
        const command = JSON.parse(event.data) as MobileEditorCommand;
        if (command.version !== MOBILE_BRIDGE.VERSION) return;
        if (command.kind === MOBILE_BRIDGE.INITIALIZE && validateDocument(command.document).ok) setInitial({ document: command.document, editable: command.editable, locale: command.locale });
        else if (command.kind === MOBILE_BRIDGE.EDITABLE) { setInitial(current => current ? { ...current, editable: command.editable } : null); handle.current?.setEditable(command.editable); }
      } catch { /* Foreign messages do not participate in the editor protocol. */ }
    };
    window.addEventListener("message", receive);
    postMessage(JSON.stringify({ version: MOBILE_BRIDGE.VERSION, kind: MOBILE_BRIDGE.READY }));
    return () => window.removeEventListener("message", receive);
  }, [postMessage]);
  return initial ? <DisNoteEditor key={initial.document.id} ref={handle} initialDocument={initial.document} editable={initial.editable} locale={initial.locale} onDocumentChange={document => postMessage(JSON.stringify({ version: MOBILE_BRIDGE.VERSION, kind: MOBILE_BRIDGE.DOCUMENT, document }))} /> : null;
}
