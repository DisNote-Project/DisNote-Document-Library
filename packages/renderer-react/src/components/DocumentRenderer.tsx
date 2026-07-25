import type { ReactNode } from "react";
import type { DisNoteDocument, BlockRegistry } from "@disnote/document-core";
import {
  DocumentRenderContext,
  defaultTheme,
  type DocumentTheme,
  type ReferenceResolver,
  type AssetResolver,
  type ReactBlockRenderers,
} from "../context/context.js";
import { BlockList } from "./blocks.js";

export interface DocumentRendererProps {
  document: DisNoteDocument;
  registry: BlockRegistry;
  mode?: "published" | "preview";
  theme?: DocumentTheme;
  referenceResolver?: ReferenceResolver;
  assetResolver?: AssetResolver;
  blockRenderers?: ReactBlockRenderers;
  className?: string;
}

/**
 * Render a validated DisNoteDocument as React. This component never loads the
 * editor. Callers should validate + migrate the document before rendering.
 */
export function DocumentRenderer(props: DocumentRendererProps): ReactNode {
  const theme = props.theme ?? defaultTheme;
  const value = {
    registry: props.registry,
    theme,
    mode: props.mode ?? "published",
    ...(props.referenceResolver ? { referenceResolver: props.referenceResolver } : {}),
    ...(props.assetResolver ? { assetResolver: props.assetResolver } : {}),
    ...(props.blockRenderers ? { blockRenderers: props.blockRenderers } : {}),
  };
  return (
    <DocumentRenderContext.Provider value={value}>
      <div
        className={props.className ?? "disnote-document"}
        style={{ color: theme.colors.text, background: theme.colors.background }}
      >
        <BlockList blocks={props.document.blocks} />
      </div>
    </DocumentRenderContext.Provider>
  );
}
