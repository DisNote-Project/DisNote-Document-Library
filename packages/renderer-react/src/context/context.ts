import { createContext, useContext, type ReactNode } from "react";
import type { BlockRegistry, DisNoteBlock, DisNoteInline } from "@disnote/document-core";

export interface DocumentTheme {
  colors: {
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    focus: string;
    selection: string;
    link: string;
    danger: string;
  };
}

export const defaultTheme: DocumentTheme = {
  colors: {
    background: "#ffffff",
    surface: "#f5f7f7",
    text: "#1a1c1c",
    textMuted: "#5c6666",
    border: "#e0e4e4",
    focus: "#0ea5a5",
    selection: "#b8efe6",
    link: "#0d9488",
    danger: "#dc2626",
  },
};

export type ReferenceResolution =
  | { status: "resolved"; href?: string; label: string }
  | { status: "forbidden"; label: string }
  | { status: "missing"; label: string };

export interface ReferenceResolver {
  (targetType: string, targetId: string, fallbackLabel: string): ReferenceResolution;
}

export interface AssetResolver {
  (assetId: string): string | undefined;
}

export interface ReactBlockRendererApi {
  block: DisNoteBlock;
  renderInline(content: DisNoteInline[] | undefined): ReactNode;
  renderChildren(blocks: DisNoteBlock[] | undefined): ReactNode;
}

export interface ReactBlockRenderer {
  (api: ReactBlockRendererApi): ReactNode;
}

export type ReactBlockRenderers = Readonly<Record<string, ReactBlockRenderer>>;

export interface DocumentRenderContextValue {
  registry: BlockRegistry;
  theme: DocumentTheme;
  mode: "published" | "preview";
  referenceResolver?: ReferenceResolver;
  assetResolver?: AssetResolver;
  blockRenderers?: ReactBlockRenderers;
}

export const DocumentRenderContext = createContext<DocumentRenderContextValue | null>(null);

export function useDocumentRenderContext(): DocumentRenderContextValue {
  const ctx = useContext(DocumentRenderContext);
  if (!ctx) throw new Error("DisNote render components must be used inside <DocumentRenderer>.");
  return ctx;
}
