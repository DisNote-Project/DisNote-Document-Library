import type { DisNoteBlock } from "@disnote/document-core";
import {
  paragraph,
  heading,
  bulletListItem,
  numberedListItem,
  checklistItem,
  quote,
  codeBlock,
  divider,
  callout,
} from "@disnote/document-core";
import type { EditorMessageKey } from "../i18n/dictionary.js";

export interface SlashCommand {
  id: string;
  titleKey: EditorMessageKey;
  group: "basic" | "lists" | "media" | "advanced";
  keywords: string[];
  /** Build the block this command inserts. */
  create(): DisNoteBlock;
}

/** The default slash-menu registry for the article/workspace presets. */
export const defaultSlashCommands: SlashCommand[] = [
  { id: "paragraph", titleKey: "slash.paragraph", group: "basic", keywords: ["text", "paragraph", "văn bản"], create: () => paragraph([]) },
  { id: "heading1", titleKey: "slash.heading1", group: "basic", keywords: ["h1", "title", "tiêu đề"], create: () => heading(1, []) },
  { id: "heading2", titleKey: "slash.heading2", group: "basic", keywords: ["h2", "tiêu đề"], create: () => heading(2, []) },
  { id: "heading3", titleKey: "slash.heading3", group: "basic", keywords: ["h3", "tiêu đề"], create: () => heading(3, []) },
  { id: "bulletList", titleKey: "slash.bulletList", group: "lists", keywords: ["bullet", "ul", "danh sách"], create: () => bulletListItem([]) },
  { id: "numberedList", titleKey: "slash.numberedList", group: "lists", keywords: ["number", "ol", "số"], create: () => numberedListItem([]) },
  { id: "checklist", titleKey: "slash.checklist", group: "lists", keywords: ["todo", "check", "kiểm"], create: () => checklistItem([], false) },
  { id: "quote", titleKey: "slash.quote", group: "basic", keywords: ["quote", "trích dẫn"], create: () => quote([]) },
  { id: "code", titleKey: "slash.code", group: "advanced", keywords: ["code", "mã"], create: () => codeBlock("", "text") },
  { id: "divider", titleKey: "slash.divider", group: "advanced", keywords: ["hr", "divider", "đường kẻ"], create: () => divider() },
  { id: "callout", titleKey: "slash.callout", group: "advanced", keywords: ["callout", "note", "ghi chú"], create: () => callout([], "info") },
];

/** Filter commands by a query against id, keywords (case-insensitive). */
export function filterSlashCommands(query: string, commands: SlashCommand[] = defaultSlashCommands): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter(
    (c) => c.id.toLowerCase().includes(q) || c.keywords.some((k) => k.toLowerCase().includes(q)),
  );
}
