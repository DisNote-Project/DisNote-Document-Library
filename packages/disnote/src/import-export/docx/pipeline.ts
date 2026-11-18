import { exportMarkdownLossy } from "../markdown/export.js";
import { importMarkdown } from "../markdown/import.js";
import type { InteropWarning } from "../warnings.js";
import { exportDocx } from "./export.js";
import { importDocx } from "./import.js";
import type { DocxDiagnostic, DocxImportOptions } from "./model.js";

export interface DocxToMarkdownResult {
  markdown: string;
  diagnostics: DocxDiagnostic[];
  warnings: InteropWarning[];
  source: "embedded-canonical" | "wordprocessingml";
}

export interface MarkdownToDocxResult {
  bytes: Uint8Array;
  diagnostics: DocxDiagnostic[];
  warnings: InteropWarning[];
}

export function convertDocxToMarkdown(bytes: Uint8Array, options: DocxImportOptions = {}): DocxToMarkdownResult {
  const imported = importDocx(bytes, options);
  const exported = exportMarkdownLossy(imported.document);
  return {
    markdown: exported.output,
    diagnostics: imported.diagnostics,
    warnings: exported.warnings,
    source: imported.source,
  };
}

export function convertMarkdownToDocx(markdown: string, options: { now?: string } = {}): MarkdownToDocxResult {
  const imported = importMarkdown(markdown, options);
  const exported = exportDocx(imported.document);
  return { bytes: exported.bytes, diagnostics: exported.diagnostics, warnings: imported.warnings };
}
