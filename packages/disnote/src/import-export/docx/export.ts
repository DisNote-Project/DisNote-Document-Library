import { strToU8, zipSync } from "fflate";
import {
  canonicalJson,
  checksum,
  type DisNoteBlock,
  type DisNoteDocument,
  type DisNoteInline,
  type JsonValue,
  type TextMark,
} from "../../core/index.js";
import { sha256Hex } from "../../core/serialization/sha256.js";
import { DOCX_DIAGNOSTIC_CODES, DOCX_ERRORS, DOCX_PATHS, DOCX_STYLES } from "./constants.js";
import type { DocxBlockCodec, DocxDiagnostic, DocxExportOptions, DocxExportResult } from "./model.js";
import { escapeXml } from "./xml.js";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

export function exportDocx(document: DisNoteDocument, options: DocxExportOptions = {}): DocxExportResult {
  const diagnostics: DocxDiagnostic[] = [];
  const hyperlinks = new Map<string, string>();
  const extensions = codecMap(options.extensions);
  const body = document.blocks.map((block) => blockToWordXml(block, diagnostics, hyperlinks, extensions)).join("");
  const documentXml = `${XML_DECLARATION}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  const snapshotXml = snapshot(document, documentXml);
  const files: Record<string, Uint8Array> = {
    [DOCX_PATHS.CONTENT_TYPES]: strToU8(contentTypes()),
    [DOCX_PATHS.ROOT_RELS]: strToU8(rootRelationships()),
    [DOCX_PATHS.DOCUMENT]: strToU8(documentXml),
    [DOCX_PATHS.DOCUMENT_RELS]: strToU8(documentRelationships(hyperlinks)),
    [DOCX_PATHS.STYLES]: strToU8(styles()),
    [DOCX_PATHS.NUMBERING]: strToU8(numbering()),
    [DOCX_PATHS.CORE_PROPERTIES]: strToU8(coreProperties(document)),
    [DOCX_PATHS.APP_PROPERTIES]: strToU8(appProperties()),
    [DOCX_PATHS.DISNOTE_SNAPSHOT]: strToU8(snapshotXml),
  };
  return { bytes: zipSync(files, { level: 6 }), diagnostics };
}

function blockToWordXml(block: DisNoteBlock, diagnostics: DocxDiagnostic[], hyperlinks: Map<string, string>, extensions: Map<string, DocxBlockCodec>): string {
  const children = (block.children ?? []).map((child) => blockToWordXml(child, diagnostics, hyperlinks, extensions)).join("");
  switch (block.type) {
    case "paragraph": return paragraphXml(block.content, DOCX_STYLES.NORMAL, block.id, hyperlinks) + children;
    case "heading": return paragraphXml(block.content, `${DOCX_STYLES.HEADING_PREFIX}${numberProp(block, "level", 1)}`, block.id, hyperlinks) + children;
    case "bulletListItem": return listParagraph(block, 1, hyperlinks) + children;
    case "numberedListItem": return listParagraph(block, 2, hyperlinks) + children;
    case "checklistItem": return paragraphXml([{ type: "text", text: block.props["checked"] === true ? "☒ " : "☐ " }, ...(block.content ?? [])], DOCX_STYLES.NORMAL, block.id, hyperlinks) + children;
    case "quote": return paragraphXml(block.content, DOCX_STYLES.QUOTE, block.id, hyperlinks) + children;
    case "codeBlock": return paragraphXml([{ type: "text", text: stringProp(block, "code") }], DOCX_STYLES.CODE, block.id, hyperlinks);
    case "callout": return paragraphXml(block.content, DOCX_STYLES.CALLOUT, block.id, hyperlinks) + children;
    case "divider": return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="808080"/></w:pBdr></w:pPr></w:p>`;
    case "table": return tableXml(block, hyperlinks);
    case "math": return paragraphXml([{ type: "text", text: `$$${stringProp(block, "code")}$$` }], DOCX_STYLES.NORMAL, block.id, hyperlinks);
    default:
      if (extensions.has(block.type)) {
        const projection = extensions.get(block.type)!.toWordText(block);
        return paragraphXml([{ type: "text", text: `[DisNote:${block.type}] ${projection}` }], DOCX_STYLES.EXTENSION, block.id, hyperlinks) + children;
      }
      diagnostics.push({ code: DOCX_DIAGNOSTIC_CODES.UNSUPPORTED_BLOCK_PLACEHOLDER, message: `Block ${block.type} is preserved in the embedded DisNote snapshot and represented by a Word placeholder.`, blockId: block.id });
      return paragraphXml([{ type: "text", text: `[DisNote:${block.type}]` }], DOCX_STYLES.EXTENSION, block.id, hyperlinks) + children;
  }
}

function paragraphXml(content: DisNoteInline[] | undefined, style: string, _id: string, hyperlinks: Map<string, string>): string {
  return `<w:p><w:pPr><w:pStyle w:val="${escapeXml(style)}"/></w:pPr>${inlineXml(content, hyperlinks)}</w:p>`;
}

function listParagraph(block: DisNoteBlock, numId: number, hyperlinks: Map<string, string>): string {
  return `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>${inlineXml(block.content, hyperlinks)}</w:p>`;
}

function inlineXml(content: DisNoteInline[] | undefined, hyperlinks: Map<string, string>): string {
  return (content ?? []).map((node) => {
    if (node.type === "text") return runXml(node.text, node.marks);
    if (node.type === "link") {
      const id = `rIdLink${hyperlinks.size + 1}`;
      hyperlinks.set(id, node.href);
      return `<w:hyperlink r:id="${id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${node.content.map((part) => runXml(part.text, [...(part.marks ?? []), { type: "underline" }])).join("")}</w:hyperlink>`;
    }
    return runXml(node.label);
  }).join("");
}

function runXml(value: string, marks: TextMark[] = []): string {
  const properties = [
    marks.some((mark) => mark.type === "bold") ? "<w:b/>" : "",
    marks.some((mark) => mark.type === "italic") ? "<w:i/>" : "",
    marks.some((mark) => mark.type === "underline") ? '<w:u w:val="single"/>' : "",
    marks.some((mark) => mark.type === "strike") ? "<w:strike/>" : "",
    marks.some((mark) => mark.type === "code") ? `<w:rStyle w:val="${DOCX_STYLES.CODE}"/>` : "",
  ].join("");
  const pieces = value.split("\n");
  return `<w:r>${properties ? `<w:rPr>${properties}</w:rPr>` : ""}${pieces.map((piece, index) => `${index ? "<w:br/>" : ""}<w:t xml:space="preserve">${escapeXml(piece)}</w:t>`).join("")}</w:r>`;
}

function tableXml(block: DisNoteBlock, hyperlinks: Map<string, string>): string {
  const rows = Array.isArray(block.props["rows"]) ? block.props["rows"] : [];
  const rowXml = rows.map((row) => {
    const cells = typeof row === "object" && row !== null && "cells" in row && Array.isArray(row.cells) ? row.cells : [];
    return `<w:tr>${cells.map((cell) => `<w:tc><w:tcPr/>${paragraphXml(cell as unknown as DisNoteInline[], DOCX_STYLES.NORMAL, block.id, hyperlinks)}</w:tc>`).join("")}</w:tr>`;
  }).join("");
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/></w:tblPr>${rowXml}</w:tbl>`;
}

function snapshot(document: DisNoteDocument, documentXml: string): string {
  return `${XML_DECLARATION}<disnote:document xmlns:disnote="https://disnote.app/ns/document" format="disnote-document" schemaVersion="${document.schemaVersion}" checksum="${checksum(document)}" wordChecksum="${sha256Hex(documentXml)}"><disnote:json>${escapeXml(canonicalJson(document as unknown as JsonValue))}</disnote:json></disnote:document>`;
}

function numberProp(block: DisNoteBlock, key: string, fallback: number): number { return typeof block.props[key] === "number" ? block.props[key] : fallback; }
function stringProp(block: DisNoteBlock, key: string): string { return typeof block.props[key] === "string" ? block.props[key] : ""; }

function contentTypes(): string { return `${XML_DECLARATION}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`; }
function rootRelationships(): string { return `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`; }
function documentRelationships(hyperlinks: Map<string, string>): string { return `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="rIdDisNoteDocument" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/disnote-document.xml"/>${[...hyperlinks].map(([id, target]) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(target)}" TargetMode="External"/>`).join("")}</Relationships>`; }
function styles(): string { return `${XML_DECLARATION}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>${[1,2,3].map((level) => `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="${34-level*4}"/></w:rPr></w:style>`).join("")}<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="DisNoteCode"><w:name w:val="DisNote Code"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="DisNoteCallout"><w:name w:val="DisNote Callout"/><w:pPr><w:shd w:fill="E8F4FD"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="DisNoteExtension"><w:name w:val="DisNote Extension"/><w:rPr><w:color w:val="666666"/><w:i/></w:rPr></w:style><w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/></w:style></w:styles>`; }
function numbering(): string { return `${XML_DECLARATION}<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num></w:numbering>`; }
function coreProperties(document: DisNoteDocument): string { return `${XML_DECLARATION}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(document.metadata.title ?? "")}</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">${escapeXml(document.metadata.createdAt)}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${escapeXml(document.metadata.updatedAt)}</dcterms:modified></cp:coreProperties>`; }
function appProperties(): string { return `${XML_DECLARATION}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>DisNote Document Library</Application></Properties>`; }

function codecMap(codecs: readonly DocxBlockCodec[] | undefined): Map<string, DocxBlockCodec> {
  const result = new Map<string, DocxBlockCodec>();
  for (const codec of codecs ?? []) {
    if (!codec.blockType || result.has(codec.blockType)) throw new Error(DOCX_ERRORS.EXTENSION_CODEC_INVALID);
    result.set(codec.blockType, codec);
  }
  return result;
}
