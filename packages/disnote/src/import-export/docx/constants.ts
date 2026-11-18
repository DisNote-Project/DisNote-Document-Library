export const DOCX_PATHS = {
  CONTENT_TYPES: "[Content_Types].xml",
  ROOT_RELS: "_rels/.rels",
  DOCUMENT: "word/document.xml",
  DOCUMENT_RELS: "word/_rels/document.xml.rels",
  STYLES: "word/styles.xml",
  NUMBERING: "word/numbering.xml",
  CORE_PROPERTIES: "docProps/core.xml",
  APP_PROPERTIES: "docProps/app.xml",
  DISNOTE_SNAPSHOT: "customXml/disnote-document.xml",
} as const;

export const DOCX_LIMITS = {
  MAX_ARCHIVE_BYTES: 64 * 1024 * 1024,
  MAX_ENTRY_BYTES: 32 * 1024 * 1024,
  MAX_ENTRIES: 2_000,
  MAX_BLOCKS: 50_000,
  MAX_XML_BYTES: 16 * 1024 * 1024,
} as const;

export const DOCX_DIAGNOSTIC_CODES = {
  EMBEDDED_SNAPSHOT_USED: "embedded-snapshot-used",
  EMBEDDED_SNAPSHOT_STALE: "embedded-snapshot-stale",
  EMBEDDED_SNAPSHOT_INVALID: "embedded-snapshot-invalid",
  UNSUPPORTED_BLOCK_PLACEHOLDER: "unsupported-block-placeholder",
  UNSUPPORTED_WORD_CONTENT: "unsupported-word-content",
  INVALID_ARCHIVE: "invalid-docx-archive",
  LIMIT_EXCEEDED: "docx-limit-exceeded",
} as const;

export const DOCX_STYLES = {
  NORMAL: "Normal",
  TITLE: "Title",
  HEADING_PREFIX: "Heading",
  QUOTE: "Quote",
  CODE: "DisNoteCode",
  CALLOUT: "DisNoteCallout",
  EXTENSION: "DisNoteExtension",
} as const;

export const DOCX_ERRORS = {
  EXTENSION_CODEC_INVALID: "docx-extension-codec-invalid",
} as const;
