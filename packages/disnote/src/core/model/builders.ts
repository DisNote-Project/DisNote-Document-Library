import type { JsonValue } from "./json.js";
import type {
  DisNoteInline,
  LinkInline,
  MentionInline,
  InlineReference,
  TextInline,
  TextMark,
} from "./inline.js";
import type { DisNoteBlock, DisNoteDocument, DocumentMetadata } from "./document.js";
import { CURRENT_SCHEMA_VERSION, DOCUMENT_FORMAT } from "./document.js";
import { createId, createDocumentId } from "./ids.js";

/* ----------------------------- inline builders ---------------------------- */

export function text(value: string, marks?: TextMark[]): TextInline {
  return marks && marks.length > 0 ? { type: "text", text: value, marks } : { type: "text", text: value };
}

export function link(href: string, content: TextInline[]): LinkInline {
  return { type: "link", href, content };
}

export function mention(entityType: "user" | "channel", entityId: string, label: string): MentionInline {
  return { type: "mention", entityType, entityId, label };
}

export function reference(
  targetType: InlineReference["targetType"],
  targetId: string,
  label: string,
): InlineReference {
  return { type: "reference", targetType, targetId, label };
}

/* ------------------------------ block builders ---------------------------- */

interface BlockInit {
  id?: string;
  props?: Record<string, JsonValue>;
  content?: DisNoteInline[];
  children?: DisNoteBlock[];
}

function block(type: string, version: number, init: BlockInit = {}): DisNoteBlock {
  const result: DisNoteBlock = {
    id: init.id ?? createId(),
    type,
    version,
    props: init.props ?? {},
  };
  if (init.content) result.content = init.content;
  if (init.children) result.children = init.children;
  return result;
}

export function paragraph(content: DisNoteInline[] = [], init: BlockInit = {}): DisNoteBlock {
  return block("paragraph", 1, { ...init, content });
}

export function heading(level: 1 | 2 | 3, content: DisNoteInline[] = [], init: BlockInit = {}): DisNoteBlock {
  return block("heading", 1, { ...init, props: { level, ...(init.props ?? {}) }, content });
}

export function bulletListItem(content: DisNoteInline[] = [], children: DisNoteBlock[] = []): DisNoteBlock {
  return block("bulletListItem", 1, children.length ? { content, children } : { content });
}

export function numberedListItem(content: DisNoteInline[] = [], children: DisNoteBlock[] = []): DisNoteBlock {
  return block("numberedListItem", 1, children.length ? { content, children } : { content });
}

export function checklistItem(content: DisNoteInline[] = [], checked = false): DisNoteBlock {
  return block("checklistItem", 1, { props: { checked }, content });
}

/** A collapsible toggle. Its `children` are the blocks revealed when expanded. */
export function toggle(content: DisNoteInline[] = [], children: DisNoteBlock[] = []): DisNoteBlock {
  return block("toggle", 1, children.length ? { content, children } : { content });
}

export function quote(content: DisNoteInline[] = []): DisNoteBlock {
  return block("quote", 1, { content });
}

export function codeBlock(code: string, language = "text"): DisNoteBlock {
  return block("codeBlock", 1, { props: { language, code } });
}

export function image(assetId: string, alt = "", extra: Record<string, JsonValue> = {}): DisNoteBlock {
  return block("image", 1, { props: { assetId, alt, ...extra } });
}

export function divider(): DisNoteBlock {
  return block("divider", 1, {});
}

export function callout(
  content: DisNoteInline[] = [],
  intent: "info" | "warning" | "success" | "danger" = "info",
): DisNoteBlock {
  return block("callout", 1, { props: { intent }, content });
}

/** Generic escape hatch for custom / namespaced blocks. */
export function customBlock(type: string, version: number, init: BlockInit = {}): DisNoteBlock {
  return block(type, version, init);
}

/* ---------------------------- document builders --------------------------- */

export interface CreateDocumentInit {
  id?: string;
  blocks?: DisNoteBlock[];
  metadata?: Partial<DocumentMetadata>;
  now?: string;
}

export function createDocument(init: CreateDocumentInit = {}): DisNoteDocument {
  const now = init.now ?? new Date().toISOString();
  const metadata: DocumentMetadata = {
    createdAt: init.metadata?.createdAt ?? now,
    updatedAt: init.metadata?.updatedAt ?? now,
    ...init.metadata,
  };
  return {
    format: DOCUMENT_FORMAT,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: init.id ?? createDocumentId(),
    blocks: init.blocks ?? [],
    metadata,
  };
}
