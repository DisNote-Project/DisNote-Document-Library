"use client";
import type { HTMLAttributes } from "react";
import { joinClassNames, type DisNoteStyle } from "../styles/index.js";

export const DOCUMENT_PAGE_WIDTHS = { STANDARD: "standard", FULL: "full" } as const;
export type DocumentPageWidth = typeof DOCUMENT_PAGE_WIDTHS[keyof typeof DOCUMENT_PAGE_WIDTHS];
export interface DocumentPageProps extends HTMLAttributes<HTMLDivElement> {
  width?: DocumentPageWidth;
  style?: DisNoteStyle;
}
/** Layout preference only: changing width preserves the mounted editor and JSON. */
export function DocumentPage({ width = DOCUMENT_PAGE_WIDTHS.STANDARD, className, style, ...props }: DocumentPageProps) {
  return <div {...props} className={joinClassNames("disnote-page", className)} data-disnote-width={width}
    style={{ boxSizing: "border-box", width: "100%", minWidth: 0,
      maxWidth: width === DOCUMENT_PAGE_WIDTHS.FULL ? "100%" : "var(--disnote-page-width, 820px)",
      marginInline: "auto", ...style }} />;
}
