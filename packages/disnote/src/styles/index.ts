import type { CSSProperties } from "react";
/** Public design tokens shared by the editor and React renderer. */
export const DISNOTE_CSS_VARIABLES = {
  background: "--disnote-background", surface: "--disnote-surface", text: "--disnote-text",
  textMuted: "--disnote-text-muted", border: "--disnote-border", focus: "--disnote-focus",
  selection: "--disnote-selection", link: "--disnote-link", danger: "--disnote-danger",
  fontFamily: "--disnote-font-family", fontSize: "--disnote-font-size", lineHeight: "--disnote-line-height",
  radius: "--disnote-radius", blockGap: "--disnote-block-gap", cardPadding: "--disnote-card-padding",
  editorPadding: "--disnote-editor-padding", captionSize: "--disnote-caption-size",
} as const;
export type DisNoteCSSVariables = Partial<Record<typeof DISNOTE_CSS_VARIABLES[keyof typeof DISNOTE_CSS_VARIABLES], string | number>>;
export type DisNoteStyle = CSSProperties & DisNoteCSSVariables;
export const DISNOTE_SURFACES = { EDITOR: "editor", RENDERER: "renderer" } as const;
export const joinClassNames = (...names: (string | undefined)[]) => names.filter(Boolean).join(" ");
