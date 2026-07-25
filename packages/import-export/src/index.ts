export { exportMarkdownLossy } from "./markdown/export.js";
export { importMarkdown, parseInline } from "./markdown/import.js";
export { importHtml, parseInlineHtml } from "./html/import.js";
export {
  type InteropWarning,
  type LossyExportResult,
  type ImportResult,
  WarningSink,
} from "./warnings.js";

/**
 * Note: safe *HTML export* is provided by `@disnote/renderer-html`
 * (`renderDocumentToHtml`). The canonical format is DisNoteDocument JSON;
 * Markdown and HTML here are lossy interchange formats.
 */
