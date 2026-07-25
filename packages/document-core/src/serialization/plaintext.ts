import type { DisNoteInline } from "../model/inline.js";
import type { DisNoteBlock, DisNoteDocument } from "../model/document.js";
import type { BlockRegistry } from "../registry/index.js";

/** Concatenate the visible text of an inline sequence. */
export function extractInlineText(content: DisNoteInline[] | undefined): string {
  if (!content) return "";
  let out = "";
  for (const node of content) {
    switch (node.type) {
      case "text":
        out += node.text;
        break;
      case "link":
        out += extractInlineText(node.content);
        break;
      case "mention":
      case "reference":
        out += node.label;
        break;
    }
  }
  return out;
}

export interface HeadingEntry {
  level: number;
  text: string;
  blockId: string;
}

/** Extract the heading outline (in document order). */
export function extractHeadings(document: DisNoteDocument): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  const walk = (blocks: DisNoteBlock[]): void => {
    for (const block of blocks) {
      if (block.type === "heading") {
        const rawLevel = block.props["level"];
        const level = typeof rawLevel === "number" ? rawLevel : 1;
        headings.push({ level, text: extractInlineText(block.content), blockId: block.id });
      }
      if (block.children) walk(block.children);
    }
  };
  walk(document.blocks);
  return headings;
}

/**
 * Plain-text projection of a whole document. When a registry is supplied, a
 * block's own `toPlainText` is used (so custom blocks project correctly);
 * otherwise inline content is concatenated as a sensible default.
 */
export function extractDocumentPlainText(document: DisNoteDocument, registry?: BlockRegistry): string {
  const lines: string[] = [];
  const walk = (blocks: DisNoteBlock[]): void => {
    for (const block of blocks) {
      const def = registry?.get(block.type);
      if (def) {
        lines.push(def.toPlainText(block as never));
      } else if (block.type === "codeBlock") {
        const code = block.props["code"];
        lines.push(typeof code === "string" ? code : "");
      } else {
        lines.push(extractInlineText(block.content));
      }
      if (block.children) walk(block.children);
    }
  };
  walk(document.blocks);
  return lines.filter((l) => l.length > 0).join("\n");
}
