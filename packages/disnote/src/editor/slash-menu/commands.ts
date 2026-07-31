import type { DisNoteBlock } from "../../core/index.js";
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
} from "../../core/index.js";
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
  {
    id: "paragraph",
    titleKey: "slash.paragraph",
    group: "basic",
    keywords: ["text", "paragraph"],
    create: () => paragraph([]),
  },
  {
    id: "heading1",
    titleKey: "slash.heading1",
    group: "basic",
    keywords: ["h1", "title", "heading"],
    create: () => heading(1, []),
  },
  {
    id: "heading2",
    titleKey: "slash.heading2",
    group: "basic",
    keywords: ["h2", "heading"],
    create: () => heading(2, []),
  },
  {
    id: "heading3",
    titleKey: "slash.heading3",
    group: "basic",
    keywords: ["h3", "heading"],
    create: () => heading(3, []),
  },
  {
    id: "bulletList",
    titleKey: "slash.bulletList",
    group: "lists",
    keywords: ["bullet", "unordered", "ul", "list"],
    create: () => bulletListItem([]),
  },
  {
    id: "numberedList",
    titleKey: "slash.numberedList",
    group: "lists",
    keywords: ["number", "ordered", "ol", "list"],
    create: () => numberedListItem([]),
  },
  {
    id: "checklist",
    titleKey: "slash.checklist",
    group: "lists",
    keywords: ["todo", "check", "task"],
    create: () => checklistItem([], false),
  },
  {
    id: "quote",
    titleKey: "slash.quote",
    group: "basic",
    keywords: ["quote", "citation"],
    create: () => quote([]),
  },
  {
    id: "code",
    titleKey: "slash.code",
    group: "advanced",
    keywords: ["code", "source"],
    create: () => codeBlock("", "text"),
  },
  {
    id: "divider",
    titleKey: "slash.divider",
    group: "advanced",
    keywords: ["hr", "divider", "separator"],
    create: () => divider(),
  },
  {
    id: "callout",
    titleKey: "slash.callout",
    group: "advanced",
    keywords: ["callout", "note", "tip", "warning"],
    create: () => callout([], "info"),
  },
];

/** Filter commands by a query against id, keywords (case-insensitive). */
export function filterSlashCommands(
  query: string,
  commands: SlashCommand[] = defaultSlashCommands
): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter(
    (c) =>
      c.id.toLowerCase().includes(q) ||
      c.keywords.some((k) => k.toLowerCase().includes(q))
  );
}
