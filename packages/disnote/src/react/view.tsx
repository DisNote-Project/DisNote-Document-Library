"use client";
import { useMemo } from "react";
import { createDefaultRegistry } from "../core/index.js";
import { DocumentRenderer, type DocumentRendererProps } from "../renderer-react/index.js";
export interface DocumentViewProps extends Omit<DocumentRendererProps, "registry"> { registry?: DocumentRendererProps["registry"] }
/** Dedicated read-only entry: no editor imports, including in the build graph. */
export function DocumentView(props: DocumentViewProps) {
  const registry = useMemo(() => props.registry ?? createDefaultRegistry(), [props.registry]);
  return <DocumentRenderer {...props} registry={registry} />;
}
export { createDocument, heading, paragraph, text } from "../core/index.js";
export { DISNOTE_CSS_VARIABLES, type DisNoteCSSVariables, type DisNoteStyle } from "../styles/index.js";
