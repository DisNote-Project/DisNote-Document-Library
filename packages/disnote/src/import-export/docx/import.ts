import { strFromU8, unzipSync } from "fflate";
import {
  bulletListItem,
  callout,
  checksum,
  checklistItem,
  codeBlock,
  createDocument,
  customBlock,
  divider,
  heading,
  link,
  numberedListItem,
  paragraph,
  quote,
  safeUrl,
  text,
  validateDocument,
  type DisNoteBlock,
  type DisNoteDocument,
  type DisNoteInline,
  type TextMark,
  type JsonValue,
} from "../../core/index.js";
import { sha256Hex } from "../../core/serialization/sha256.js";
import { DOCX_DIAGNOSTIC_CODES, DOCX_LIMITS, DOCX_PATHS } from "./constants.js";
import { codecMap } from "./codec.js";
import type { DocxBlockCodec, DocxDiagnostic, DocxImportOptions, DocxImportResult } from "./model.js";
import { attribute, elements, textNodes, unescapeXml } from "./xml.js";

export function importDocx(bytes: Uint8Array, options: DocxImportOptions = {}): DocxImportResult {
  if (bytes.byteLength === 0 || bytes.byteLength > DOCX_LIMITS.MAX_ARCHIVE_BYTES) {
    throw new Error(DOCX_DIAGNOSTIC_CODES.LIMIT_EXCEEDED);
  }
  const files = safeUnzip(bytes);
  const documentXml = readRequired(files, DOCX_PATHS.DOCUMENT);
  const relationships = parseRelationships(files[DOCX_PATHS.DOCUMENT_RELS]);
  const diagnostics: DocxDiagnostic[] = [];
  const embedded = files[DOCX_PATHS.DISNOTE_SNAPSHOT];
  if (embedded && options.preferEmbeddedSnapshot !== false) {
    const restored = restoreEmbedded(strFromU8(embedded), documentXml, diagnostics);
    if (restored) return { document: restored, diagnostics, source: "embedded-canonical" };
  }
  const metadata = embedded ? embeddedMetadata(strFromU8(embedded)) : undefined;
  const blocks = parseBody(documentXml, relationships, codecMap(options.extensions), diagnostics);
  if (blocks.length > DOCX_LIMITS.MAX_BLOCKS) throw new Error(DOCX_DIAGNOSTIC_CODES.LIMIT_EXCEEDED);
  const document = createDocument({
    id: metadata?.id,
    blocks,
    now: options.now,
    metadata: metadata?.metadata,
  });
  return { document, diagnostics, source: "wordprocessingml" };
}

function safeUnzip(bytes: Uint8Array): Record<string, Uint8Array> {
  let entries = 0;
  let expanded = 0;
  try {
    return unzipSync(bytes, { filter: (entry) => {
      entries++;
      expanded += entry.originalSize;
      if (entries > DOCX_LIMITS.MAX_ENTRIES || entry.originalSize > DOCX_LIMITS.MAX_ENTRY_BYTES || expanded > DOCX_LIMITS.MAX_ARCHIVE_BYTES) {
        throw new Error(DOCX_DIAGNOSTIC_CODES.LIMIT_EXCEEDED);
      }
      return !entry.name.includes("..") && !entry.name.startsWith("/") && !entry.name.startsWith("\\");
    } });
  } catch (error) {
    if (error instanceof Error && error.message === DOCX_DIAGNOSTIC_CODES.LIMIT_EXCEEDED) throw error;
    const failure = new Error(DOCX_DIAGNOSTIC_CODES.INVALID_ARCHIVE);
    Object.defineProperty(failure, "cause", { value: error, enumerable: false });
    throw failure;
  }
}

function readRequired(files: Record<string, Uint8Array>, path: string): string {
  const value = files[path];
  if (!value || value.byteLength > DOCX_LIMITS.MAX_XML_BYTES) throw new Error(DOCX_DIAGNOSTIC_CODES.INVALID_ARCHIVE);
  return strFromU8(value);
}

function restoreEmbedded(snapshotXml: string, wordXml: string, diagnostics: DocxDiagnostic[]): DisNoteDocument | null {
  const wordChecksum = attribute(snapshotXml, "wordChecksum");
  if (!wordChecksum || wordChecksum !== sha256Hex(wordXml)) {
    diagnostics.push({ code: DOCX_DIAGNOSTIC_CODES.EMBEDDED_SNAPSHOT_STALE, message: "The Word document changed after export; semantic WordprocessingML import was used." });
    return null;
  }
  const match = /<disnote:json>([\s\S]*?)<\/disnote:json>/u.exec(snapshotXml);
  if (!match) return invalidSnapshot(diagnostics);
  try {
    const document = JSON.parse(unescapeXml(match[1]!)) as DisNoteDocument;
    const expected = attribute(snapshotXml, "checksum");
    if (expected !== checksum(document) || !validateDocument(document).ok) return invalidSnapshot(diagnostics);
    diagnostics.push({ code: DOCX_DIAGNOSTIC_CODES.EMBEDDED_SNAPSHOT_USED, message: "The canonical DisNote snapshot was restored without loss." });
    return document;
  } catch {
    return invalidSnapshot(diagnostics);
  }
}

function invalidSnapshot(diagnostics: DocxDiagnostic[]): null {
  diagnostics.push({ code: DOCX_DIAGNOSTIC_CODES.EMBEDDED_SNAPSHOT_INVALID, message: "The embedded DisNote snapshot was invalid and was ignored." });
  return null;
}

function embeddedMetadata(snapshotXml: string): Pick<DisNoteDocument, "id" | "metadata"> | undefined {
  const match = /<disnote:json>([\s\S]*?)<\/disnote:json>/u.exec(snapshotXml);
  try {
    const parsed = JSON.parse(unescapeXml(match?.[1] ?? "")) as DisNoteDocument;
    return typeof parsed.id === "string" && parsed.metadata ? { id: parsed.id, metadata: parsed.metadata } : undefined;
  } catch { return undefined; }
}

function parseBody(xml: string, relationships: Map<string, string>, extensions: Map<string, DocxBlockCodec>, diagnostics: DocxDiagnostic[]): DisNoteBlock[] {
  const body = /<w:body(?:\s[^>]*)?>([\s\S]*?)<\/w:body>/u.exec(xml)?.[1] ?? "";
  const blocks: DisNoteBlock[] = [];
  const topLevel = /<w:(p|tbl)(?:\s[^>]*)?>[\s\S]*?<\/w:\1>/gu;
  for (const match of body.matchAll(topLevel)) {
    if (match[1] === "tbl") blocks.push(parseTable(match[0], relationships));
    else {
      const block = parseParagraph(match[0], relationships, extensions, diagnostics);
      if (block) blocks.push(block);
    }
  }
  return blocks;
}

function parseParagraph(xml: string, relationships: Map<string, string>, extensions: Map<string, DocxBlockCodec>, diagnostics: DocxDiagnostic[]): DisNoteBlock | null {
  const content = parseRuns(xml, relationships, diagnostics);
  const rawText = textNodes(xml);
  const style = /<w:pStyle[^>]*w:val="([^"]+)"/u.exec(xml)?.[1] ?? "";
  if (/^Heading[1-3]$/u.test(style)) return heading(Number(style.slice(-1)) as 1 | 2 | 3, content);
  if (style === "Quote") return quote(content);
  if (style === "DisNoteCode") return codeBlock(rawText);
  if (style === "DisNoteCallout") return callout(content);
  if (style === "DisNoteExtension") {
    const match = /^\[DisNote:([^\]]+)\](?:\s(.*))?$/u.exec(rawText);
    const type = match?.[1] ?? "unknown";
    const codec = extensions.get(type);
    if (codec) {
      const decoded = codec.fromWordText(match?.[2] ?? "");
      if (decoded) return decoded;
    }
    diagnostics.push({ code: DOCX_DIAGNOSTIC_CODES.UNSUPPORTED_WORD_CONTENT, message: `DisNote extension placeholder ${type} was imported without its original payload.` });
    return customBlock(`word.${type}`, 1, { props: { source: "docx-placeholder" } });
  }
  const numId = Number(/<w:numId[^>]*w:val="(\d+)"/u.exec(xml)?.[1]);
  if (numId === 1) return bulletListItem(content);
  if (numId === 2) return numberedListItem(content);
  if (rawText.startsWith("☒ ") || rawText.startsWith("☐ ")) return checklistItem([text(rawText.slice(2))], rawText.startsWith("☒"));
  if (/<w:pBdr>[\s\S]*?<w:bottom/u.test(xml) && rawText.length === 0) return divider();
  if (rawText.length === 0 && content.length === 0) return null;
  return paragraph(content);
}

function parseRuns(xml: string, relationships: Map<string, string>, diagnostics: DocxDiagnostic[]): DisNoteInline[] {
  const result: DisNoteInline[] = [];
  const tokens = xml.match(/<w:hyperlink(?:\s[^>]*)?>[\s\S]*?<\/w:hyperlink>|<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/gu) ?? [];
  for (const token of tokens) {
    if (token.startsWith("<w:hyperlink")) {
      const id = /r:id="([^"]+)"/u.exec(token)?.[1];
      const href = id ? relationships.get(id) : undefined;
      const parts = parseRuns(token.replace(/^<w:hyperlink[^>]*>|<\/w:hyperlink>$/gu, ""), relationships, diagnostics)
        .filter((node): node is Extract<DisNoteInline, { type: "text" }> => node.type === "text");
      if (href && safeUrl(href, { allowedSchemes: ["https:", "http:", "mailto:", "tel:"], allowRelative: true })) result.push(link(href, parts));
      else {
        result.push(...parts);
        diagnostics.push({ code: DOCX_DIAGNOSTIC_CODES.UNSUPPORTED_WORD_CONTENT, message: "A hyperlink with a missing or unsafe relationship was imported as text." });
      }
      continue;
    }
    const run = token;
    const value = textNodes(run);
    if (!value) continue;
    const marks: TextMark[] = [];
    if (/<w:b(?:\s[^>]*)?\/>/u.test(run)) marks.push({ type: "bold" });
    if (/<w:i(?:\s[^>]*)?\/>/u.test(run)) marks.push({ type: "italic" });
    if (/<w:u\s/u.test(run)) marks.push({ type: "underline" });
    if (/<w:strike(?:\s[^>]*)?\/>/u.test(run)) marks.push({ type: "strike" });
    if (/w:rStyle[^>]*w:val="DisNoteCode"/u.test(run)) marks.push({ type: "code" });
    result.push(text(value, marks));
  }
  return result;
}

function parseTable(xml: string, relationships: Map<string, string>): DisNoteBlock {
  const rows = elements(xml, "w:tr").map((row) => ({
    cells: elements(row, "w:tc").map((cell) => parseRuns(cell, relationships, [])),
  }));
  return customBlock("table", 1, { props: { rows: rows as unknown as JsonValue } });
}

function parseRelationships(bytes: Uint8Array | undefined): Map<string, string> {
  const result = new Map<string, string>();
  if (!bytes || bytes.byteLength > DOCX_LIMITS.MAX_XML_BYTES) return result;
  const xml = strFromU8(bytes);
  for (const relationship of xml.match(/<Relationship\s[^>]*\/>/gu) ?? []) {
    const id = attribute(relationship, "Id");
    const target = attribute(relationship, "Target");
    const type = attribute(relationship, "Type");
    if (id && target && type?.endsWith("/hyperlink")) result.set(id, target);
  }
  return result;
}
