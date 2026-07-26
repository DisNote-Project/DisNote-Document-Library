import { createDocument } from "../../core/index.js";
import { importHtml } from "../html/import.js";
import { importMarkdown } from "../markdown/import.js";
import type { ImportResult } from "../warnings.js";

export interface ClipboardImportPayload {
  html?: string;
  text?: string;
}

const SEMANTIC_HTML_BLOCK = /<(?:h[1-6]|p|ul|ol|li|blockquote|pre|table|hr)\b/i;

/**
 * Import browser clipboard data into DisNote blocks.
 *
 * Rendered Markdown previews expose semantic HTML, while source editors usually
 * expose Markdown as plain text. Prefer semantic HTML so headings, lists,
 * tables, quotes, links, and inline marks survive a VS Code Preview paste.
 */
export function importClipboard(
  payload: ClipboardImportPayload,
  options: { now?: string } = {},
): ImportResult {
  const html = payload.html?.trim() ?? "";
  const text = payload.text ?? "";

  if (html && SEMANTIC_HTML_BLOCK.test(html)) {
    const imported = importHtml(html, options);
    if (imported.document.blocks.length > 0) return imported;
  }

  if (text) return importMarkdown(text, options);

  if (html) {
    const imported = importHtml(html, options);
    if (imported.document.blocks.length > 0) return imported;
  }

  return {
    document: createDocument(options.now ? { now: options.now } : {}),
    warnings: [],
  };
}
