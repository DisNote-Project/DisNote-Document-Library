import type { ReactNode } from "react";
import {
  extractHeadings,
  type DisNoteDocument,
  type BlockRegistry,
  type UrlPolicy,
} from "../../core/index.js";
import {
  DocumentRenderContext,
  defaultTheme,
  type DocumentTheme,
  type ReferenceResolver,
  type AssetResolver,
  type ReactBlockRenderers,
} from "../context/context.js";
import { BlockList } from "./blocks.js";
import { uiMessages } from "../../ui/messages.js";
import { DISNOTE_CSS_VARIABLES, DISNOTE_SURFACES, joinClassNames, type DisNoteStyle } from "../../styles/index.js";

export interface DocumentRendererProps {
  locale?: string;
  breadcrumbs?: { id: string; title: string; href?: string }[];
  document: DisNoteDocument;
  registry: BlockRegistry;
  mode?: "published" | "preview";
  theme?: DocumentTheme;
  referenceResolver?: ReferenceResolver;
  assetResolver?: AssetResolver;
  blockRenderers?: ReactBlockRenderers;
  urlPolicy?: UrlPolicy;
  className?: string;
  style?: DisNoteStyle;
  appearance?: "light" | "dark";
}

/**
 * Render a validated DisNoteDocument as React. This component never loads the
 * editor. Callers should validate + migrate the document before rendering.
 */
export function DocumentRenderer(props: DocumentRendererProps): ReactNode {
  const theme = props.theme ?? defaultTheme;
  const variables: DisNoteStyle = {};
  const colors = { ...theme.colors };
  for (const key of Object.keys(theme.colors) as (keyof typeof theme.colors)[]) {
    const variable = DISNOTE_CSS_VARIABLES[key];
    if (props.theme) variables[variable] = theme.colors[key];
    colors[key] = `var(${variable}, ${theme.colors[key]})`;
  }
  const value = {
    locale: props.locale ?? props.document.metadata.locale ?? "en",
    messages: uiMessages(props.locale ?? props.document.metadata.locale),
    ...(props.breadcrumbs ? { breadcrumbs: props.breadcrumbs } : {}),
    registry: props.registry,
    theme: { ...theme, colors },
    mode: props.mode ?? "published",
    headings: extractHeadings(props.document),
    urlPolicy: props.urlPolicy ?? {
      allowedSchemes: ["https:", "http:", "mailto:", "tel:"],
      allowRelative: true,
    },
    ...(props.referenceResolver ? { referenceResolver: props.referenceResolver } : {}),
    ...(props.assetResolver ? { assetResolver: props.assetResolver } : {}),
    ...(props.blockRenderers ? { blockRenderers: props.blockRenderers } : {}),
  };
  return (
    <DocumentRenderContext.Provider value={value}>
      <div
        className={joinClassNames("disnote-document", props.className)}
        style={{ ...(props.theme ? { color: "var(--disnote-text)", background: "var(--disnote-background)" } : {}), ...variables, ...props.style }}
        data-disnote-surface={DISNOTE_SURFACES.RENDERER}
        data-disnote-theme={props.appearance ?? "light"}
      >
        <BlockList blocks={props.document.blocks} />
      </div>
    </DocumentRenderContext.Provider>
  );
}
