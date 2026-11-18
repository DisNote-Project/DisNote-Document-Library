import type { DisNoteBlock, DisNoteDocument } from "../../core/index.js";
import type { DOCX_DIAGNOSTIC_CODES } from "./constants.js";

export type DocxDiagnosticCode = (typeof DOCX_DIAGNOSTIC_CODES)[keyof typeof DOCX_DIAGNOSTIC_CODES];

export interface DocxDiagnostic {
  code: DocxDiagnosticCode;
  message: string;
  blockId?: string;
}

export interface DocxExportResult {
  bytes: Uint8Array;
  diagnostics: DocxDiagnostic[];
}

export interface DocxImportResult {
  document: DisNoteDocument;
  diagnostics: DocxDiagnostic[];
  source: "embedded-canonical" | "wordprocessingml";
}

export interface DocxImportOptions {
  now?: string;
  preferEmbeddedSnapshot?: boolean;
  extensions?: readonly DocxBlockCodec[];
}

export interface DocxExportOptions {
  extensions?: readonly DocxBlockCodec[];
}

/** Safe extension boundary: codecs exchange text, never raw OOXML. */
export interface DocxBlockCodec {
  blockType: string;
  toWordText(block: DisNoteBlock): string;
  fromWordText(text: string): DisNoteBlock | null;
}
