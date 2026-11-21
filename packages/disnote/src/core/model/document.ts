import type { JsonValue } from "./json.js";
import type { DisNoteInline } from "./inline.js";

/** The current document schema version shipped by this library (V1). */
export const CURRENT_SCHEMA_VERSION = 1 as const;

/** The persisted format discriminator. Never a vendor value. */
export const DOCUMENT_FORMAT = "disnote-document" as const;

/** Standard core block type identifiers across DisNote Document. */
export const CORE_BLOCK_TYPES = {
  PARAGRAPH: "paragraph",
  HEADING: "heading",
  BULLET_LIST_ITEM: "bulletListItem",
  NUMBERED_LIST_ITEM: "numberedListItem",
  TOGGLE: "toggle",
  CHECKLIST_ITEM: "checklistItem",
  QUOTE: "quote",
  CODE_BLOCK: "codeBlock",
  DIVIDER: "divider",
  IMAGE: "image",
  TABLE: "table",
  CALLOUT: "callout",
  BOOKMARK: "bookmark",
  DIAGRAM: "diagram",
  MATH: "math",
  BUTTON: "button",
  DATABASE: "database",
  DATABASE_VIEW: "databaseView",
  SYNCED_SOURCE: "syncedSource",
  SYNCED_BLOCK: "syncedBlock",
  TEMPLATE_BUTTON: "templateButton",
  TOGGLE_HEADING_1: "toggleHeading1",
  TOGGLE_HEADING_2: "toggleHeading2",
  TOGGLE_HEADING_3: "toggleHeading3",
  COLUMN: "column",
  COLUMN_LIST: "columnList",
  TOC: "toc",
  TABLE_OF_CONTENTS: "tableOfContents",
  BREADCRUMB: "breadcrumb",
  VIDEO: "video",
  AUDIO: "audio",
  FILE: "file",
  TABLE_DB: "tableDb",
  BOARD: "board",
  LIST_DB: "listDb",
  GALLERY: "gallery",
  CALENDAR: "calendar",
  TIMELINE: "timeline",
  MAP: "map",
} as const;

export type CoreBlockType = (typeof CORE_BLOCK_TYPES)[keyof typeof CORE_BLOCK_TYPES];

export interface DocumentMetadata {
  title?: string;
  description?: string;
  locale?: "en" | "vi";
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  tags?: string[];
  attributes?: Record<string, JsonValue>;
}

/** A single unit of content. Blocks may nest via `children`. */
export interface DisNoteBlock {
  id: string;
  type: string;
  version: number;
  props: Record<string, JsonValue>;
  content?: DisNoteInline[];
  children?: DisNoteBlock[];
}

/** The document envelope: metadata plus a tree of blocks. */
export interface DisNoteDocument {
  format: typeof DOCUMENT_FORMAT;
  schemaVersion: number;
  id: string;
  blocks: DisNoteBlock[];
  metadata: DocumentMetadata;
}

export interface BlockSelection {
  anchorBlockId: string;
  focusBlockId: string;
}

