import type { JsonValue } from "./json.js";
import type { DisNoteInline } from "./inline.js";

/** The current document schema version shipped by this library (V1). */
export const CURRENT_SCHEMA_VERSION = 1 as const;

/** The persisted format discriminator. Never a vendor value. */
export const DOCUMENT_FORMAT = "disnote-document" as const;

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

