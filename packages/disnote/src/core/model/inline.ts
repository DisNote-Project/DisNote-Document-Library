/** Inline content model: text, links, mentions and connected-context references. */

export type TextMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "strike" }
  | { type: "code" }
  | { type: "textColor"; value: string }
  | { type: "backgroundColor"; value: string };

export type TextMarkType = TextMark["type"];

export interface TextInline {
  type: "text";
  text: string;
  marks?: TextMark[];
}

export interface LinkInline {
  type: "link";
  href: string;
  content: TextInline[];
}

export interface MentionInline {
  type: "mention";
  entityType: "user" | "channel";
  entityId: string;
  label: string;
}

/** DisNote's connected-context reference. ID is truth; snapshot is fallback UI. */
export interface InlineReference {
  type: "reference";
  targetType: "task" | "document" | "message" | "file";
  targetId: string;
  label: string;
}

export type DisNoteInline = TextInline | LinkInline | MentionInline | InlineReference;
