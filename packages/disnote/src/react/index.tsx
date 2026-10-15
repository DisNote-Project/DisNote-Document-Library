"use client";
import { forwardRef, lazy, Suspense, useEffect, useState } from "react";
import { createDocument } from "../core/index.js";
import type { DisNoteDocument } from "../core/index.js";
import type { DisNoteEditorHandle, DisNoteEditorProps } from "../editor/react/DisNoteEditor.js";
import { uiMessages } from "../ui/messages.js";
const LazyEditor = lazy(() => import("../editor/react/DisNoteEditor.js").then(module => ({ default: module.DisNoteEditor })));
export type DocumentEditorHandle = DisNoteEditorHandle;
export interface DocumentEditorProps extends Omit<DisNoteEditorProps, "initialDocument" | "onDocumentChange"> {
  initialDocument?: DisNoteDocument;
  onChange?: (document: DisNoteDocument) => void;
}
/** Uncontrolled editor. Use a new key when replacing the entire document. */
export const DocumentEditor = forwardRef<DocumentEditorHandle, DocumentEditorProps>(function DocumentEditor({ initialDocument, onChange, ...props }, ref) {
  const [initial] = useState(() => initialDocument ?? createDocument());
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <p role="status">{uiMessages(props.locale).loading}</p>;
  return <Suspense fallback={<p role="status">{uiMessages(props.locale).loading}</p>}><LazyEditor {...props} ref={ref} initialDocument={initial} onDocumentChange={onChange} /></Suspense>;
});
export { DocumentView, type DocumentViewProps } from "./view.js";
export { createDocument, heading, paragraph, text } from "../core/index.js";
export { DISNOTE_CSS_VARIABLES, type DisNoteCSSVariables, type DisNoteStyle } from "../styles/index.js";
