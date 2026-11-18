import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { formatCellAddress, normalizeCellAddress, parseCellAddress } from "./address.js";
import { SPREADSHEET_ERRORS, SPREADSHEET_LIMITS, XLSX_PATHS } from "./constants.js";
import { sha256Hex } from "./hash.js";
import type { CellScalar, SpreadsheetCell, SpreadsheetDiagnostic, SpreadsheetWorkbook, Worksheet } from "./model.js";
import { assertWorkbook } from "./validation.js";
import { createWorkbook, createWorksheet, findSheet } from "./workbook.js";

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const SNAPSHOT_PATH = "customXml/disnote-workbook.xml";

export interface CsvImportOptions {
  id: string;
  title: string;
  sheetId?: string;
  sheetName?: string;
  locale?: string;
  delimiter?: string;
  inferTypes?: boolean;
  now?: string;
}

export interface CsvExportOptions {
  delimiter?: string;
  formulas?: "formula" | "cached-value";
}

export interface SpreadsheetImportResult {
  workbook: SpreadsheetWorkbook;
  diagnostics: SpreadsheetDiagnostic[];
  source: "embedded-canonical" | "xlsx" | "csv";
}

export interface SpreadsheetExportResult {
  bytes: Uint8Array;
  diagnostics: SpreadsheetDiagnostic[];
}

export function importCsv(source: string, options: CsvImportOptions): SpreadsheetImportResult {
  const delimiter = options.delimiter ?? ",";
  if (delimiter.length !== 1) throw new Error(SPREADSHEET_ERRORS.INVALID_CSV);
  const rows = parseCsv(source, delimiter);
  const cells: Record<string, SpreadsheetCell> = {};
  let columnCount = 1;
  rows.forEach((row, rowIndex) => {
    columnCount = Math.max(columnCount, row.length);
    row.forEach((value, columnIndex) => {
      if (value !== "") cells[formatCellAddress(rowIndex + 1, columnIndex + 1)] = { value: options.inferTypes === false ? value : inferScalar(value) };
    });
  });
  const sheet = createWorksheet({ id: options.sheetId ?? "sheet-1", name: options.sheetName ?? "Sheet 1", rowCount: Math.max(rows.length, 1), columnCount });
  sheet.cells = cells;
  const workbook = createWorkbook({ id: options.id, title: options.title, locale: options.locale, now: options.now, sheets: [sheet] });
  return { workbook, diagnostics: [], source: "csv" };
}

export function exportCsv(workbook: SpreadsheetWorkbook, sheetId: string, options: CsvExportOptions = {}): string {
  const sheet = findSheet(workbook, sheetId);
  if (!sheet) throw new Error(SPREADSHEET_ERRORS.SHEET_NOT_FOUND);
  const delimiter = options.delimiter ?? ",";
  if (delimiter.length !== 1) throw new Error(SPREADSHEET_ERRORS.INVALID_CSV);
  const used = Object.keys(sheet.cells).map(parseCellAddress);
  const lastRow = Math.max(1, ...used.map((coordinate) => coordinate.row));
  const lastColumn = Math.max(1, ...used.map((coordinate) => coordinate.column));
  const lines: string[] = [];
  for (let row = 1; row <= lastRow; row += 1) {
    const values: string[] = [];
    for (let column = 1; column <= lastColumn; column += 1) {
      const cell = sheet.cells[formatCellAddress(row, column)];
      const value = options.formulas !== "cached-value" && cell?.formula ? cell.formula : cell?.value ?? "";
      values.push(escapeCsv(String(value), delimiter));
    }
    lines.push(values.join(delimiter));
  }
  return lines.join("\r\n");
}

export function exportXlsx(workbook: SpreadsheetWorkbook): SpreadsheetExportResult {
  assertWorkbook(workbook);
  const worksheetParts = workbook.sheets.map((sheet) => worksheetXml(sheet));
  const workbookPart = workbookXml(workbook);
  const stylesPart = stylesXml();
  const fingerprint = xlsxFingerprint(workbookPart, worksheetParts, stylesPart, "");
  const files: Record<string, Uint8Array> = {
    [XLSX_PATHS.CONTENT_TYPES]: strToU8(contentTypes(workbook.sheets.length)),
    [XLSX_PATHS.ROOT_RELS]: strToU8(rootRelationships()),
    [XLSX_PATHS.WORKBOOK]: strToU8(workbookPart),
    [XLSX_PATHS.WORKBOOK_RELS]: strToU8(workbookRelationships(workbook.sheets.length)),
    [XLSX_PATHS.STYLES]: strToU8(stylesPart),
    "docProps/core.xml": strToU8(coreProperties(workbook)),
    "docProps/app.xml": strToU8(appProperties(workbook.sheets.map((sheet) => sheet.name))),
    [SNAPSHOT_PATH]: strToU8(snapshotXml(workbook, fingerprint)),
  };
  worksheetParts.forEach((xml, index) => { files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(xml); });
  return { bytes: zipSync(files, { level: 6 }), diagnostics: workbook.sheets.flatMap((sheet) => Object.entries(sheet.cells).filter(([, cell]) => cell.style || cell.note).map(([address]) => ({ code: "xlsx-style-snapshot-only", message: "Cell style or note is preserved by the DisNote snapshot; the current semantic XLSX projection is value/formula focused.", sheetId: sheet.id, address }))) };
}

export function importXlsx(bytes: Uint8Array, options: { id?: string; now?: string; preferEmbeddedSnapshot?: boolean } = {}): SpreadsheetImportResult {
  const files = boundedUnzip(bytes);
  const workbookBytes = files[XLSX_PATHS.WORKBOOK];
  const relationBytes = files[XLSX_PATHS.WORKBOOK_RELS];
  if (!workbookBytes || !relationBytes) throw new Error(SPREADSHEET_ERRORS.INVALID_XLSX);
  const workbookSource = strFromU8(workbookBytes);
  const stylesSource = files[XLSX_PATHS.STYLES] ? strFromU8(files[XLSX_PATHS.STYLES]!) : "";
  const sharedStringsSource = files[XLSX_PATHS.SHARED_STRINGS] ? strFromU8(files[XLSX_PATHS.SHARED_STRINGS]!) : "";
  const relationships = parseRelationships(strFromU8(relationBytes));
  const descriptors = parseSheetDescriptors(workbookSource, relationships);
  const worksheetParts = descriptors.map((descriptor) => {
    const part = files[descriptor.path];
    if (!part || part.byteLength > SPREADSHEET_LIMITS.MAX_XML_BYTES) throw new Error(SPREADSHEET_ERRORS.INVALID_XLSX);
    return strFromU8(part);
  });
  const diagnostics: SpreadsheetDiagnostic[] = [];
  const snapshot = files[SNAPSHOT_PATH];
  if (options.preferEmbeddedSnapshot !== false && snapshot) {
    const restored = restoreSnapshot(strFromU8(snapshot), xlsxFingerprint(workbookSource, worksheetParts, stylesSource, sharedStringsSource));
    if (restored) return { workbook: restored, diagnostics: [{ code: "xlsx-embedded-snapshot-used", message: "The validated DisNote workbook snapshot was restored exactly." }], source: "embedded-canonical" };
    diagnostics.push({ code: "xlsx-embedded-snapshot-stale", message: "The embedded snapshot did not match the worksheet content and was ignored." });
  }
  const sharedStrings = parseSharedStrings(files[XLSX_PATHS.SHARED_STRINGS]);
  const sheets = descriptors.map((descriptor, index) => parseWorksheet(worksheetParts[index]!, descriptor, sharedStrings, diagnostics));
  const now = options.now ?? new Date().toISOString();
  const workbook = createWorkbook({ id: options.id ?? `xlsx-${sha256Hex(workbookSource).slice(0, 16)}`, title: parseWorkbookTitle(files["docProps/core.xml"]) ?? "Imported workbook", now, sheets });
  return { workbook, diagnostics, source: "xlsx" };
}

function worksheetXml(sheet: Worksheet): string {
  const addresses = Object.keys(sheet.cells).sort(compareAddresses);
  const rows = new Map<number, string[]>();
  for (const address of addresses) {
    const coordinate = parseCellAddress(address);
    const list = rows.get(coordinate.row) ?? [];
    list.push(cellXml(address, sheet.cells[address]!));
    rows.set(coordinate.row, list);
  }
  const used = addresses.map(parseCellAddress);
  const lastRow = Math.max(1, ...used.map((coordinate) => coordinate.row));
  const lastColumn = Math.max(1, ...used.map((coordinate) => coordinate.column));
  const columns = (sheet.columns ?? []).map((column) => `<col min="${column.index}" max="${column.index}"${column.size ? ` width="${column.size}" customWidth="1"` : ""}${column.hidden ? ' hidden="1"' : ""}/>`).join("");
  const panes = sheet.frozenRows || sheet.frozenColumns ? `<sheetViews><sheetView workbookViewId="0"><pane${sheet.frozenColumns ? ` xSplit="${sheet.frozenColumns}"` : ""}${sheet.frozenRows ? ` ySplit="${sheet.frozenRows}"` : ""} topLeftCell="${formatCellAddress((sheet.frozenRows ?? 0) + 1, (sheet.frozenColumns ?? 0) + 1)}" state="frozen"/></sheetView></sheetViews>` : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const merges = sheet.mergedCells?.length ? `<mergeCells count="${sheet.mergedCells.length}">${sheet.mergedCells.map((range) => `<mergeCell ref="${escapeXml(range.start)}:${escapeXml(range.end)}"/>`).join("")}</mergeCells>` : "";
  return `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${formatCellAddress(lastRow, lastColumn)}"/>${panes}${columns ? `<cols>${columns}</cols>` : ""}<sheetData>${[...rows].sort(([a], [b]) => a - b).map(([row, cells]) => `<row r="${row}">${cells.join("")}</row>`).join("")}</sheetData>${merges}</worksheet>`;
}

function cellXml(address: string, cell: SpreadsheetCell): string {
  const formula = cell.formula ? `<f>${escapeXml(cell.formula.slice(1))}</f>` : "";
  const value = cell.value;
  if (cell.formula && typeof value === "string") return `<c r="${address}" t="str">${formula}<v>${escapeXml(value)}</v></c>`;
  if (typeof value === "string") return `<c r="${address}" t="inlineStr">${formula}<is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  if (typeof value === "boolean") return `<c r="${address}" t="b">${formula}<v>${value ? 1 : 0}</v></c>`;
  if (typeof value === "number") return `<c r="${address}" t="n">${formula}<v>${value}</v></c>`;
  return `<c r="${address}">${formula}</c>`;
}

function parseWorksheet(xml: string, descriptor: SheetDescriptor, sharedStrings: string[], diagnostics: SpreadsheetDiagnostic[]): Worksheet {
  const cells: Record<string, SpreadsheetCell> = {};
  let maxRow = 1, maxColumn = 1;
  for (const match of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/gu)) {
    const attributes = match[1] ?? match[3] ?? "";
    const body = match[2] ?? "";
    const rawAddress = attribute(attributes, "r");
    if (!rawAddress) continue;
    let address: string;
    try { address = normalizeCellAddress(rawAddress); } catch { diagnostics.push({ code: "xlsx-invalid-cell-address", message: `Invalid cell address ${rawAddress} was ignored.`, sheetId: descriptor.id }); continue; }
    const coordinate = parseCellAddress(address);
    maxRow = Math.max(maxRow, coordinate.row); maxColumn = Math.max(maxColumn, coordinate.column);
    const type = attribute(attributes, "t");
    const formula = elementText(body, "f");
    const rawValue = elementText(body, "v");
    const inline = elementText(body, "t");
    const cell: SpreadsheetCell = {};
    if (formula !== undefined) cell.formula = `=${decodeXml(formula)}`;
    if (type === "inlineStr") cell.value = decodeXml(inline ?? "");
    else if (type === "s") cell.value = sharedStrings[Number(rawValue)] ?? "";
    else if (type === "b") cell.value = rawValue === "1";
    else if (type === "str" || type === "e") cell.value = decodeXml(rawValue ?? "");
    else if (rawValue !== undefined && rawValue !== "") cell.value = Number.isFinite(Number(rawValue)) ? Number(rawValue) : decodeXml(rawValue);
    cells[address] = cell;
    if (attribute(attributes, "s") && attribute(attributes, "s") !== "0") diagnostics.push({ code: "xlsx-style-not-imported", message: "An external XLSX cell style was not mapped into the current semantic model.", sheetId: descriptor.id, address });
  }
  const dimension = /<dimension\b[^>]*ref="(?:[^:"]+:)?([A-Z]+[0-9]+)"/u.exec(xml)?.[1];
  if (dimension) { const coordinate = parseCellAddress(dimension); maxRow = Math.max(maxRow, coordinate.row); maxColumn = Math.max(maxColumn, coordinate.column); }
  const sheet = createWorksheet({ id: descriptor.id, name: descriptor.name, rowCount: maxRow, columnCount: maxColumn });
  sheet.cells = cells;
  sheet.hidden = descriptor.hidden;
  sheet.mergedCells = [...xml.matchAll(/<mergeCell\b[^>]*ref="([A-Z]+[0-9]+):([A-Z]+[0-9]+)"[^>]*\/>/gu)].map((match) => ({ start: normalizeCellAddress(match[1]!), end: normalizeCellAddress(match[2]!) }));
  const pane = /<pane\b([^>]*)\/>/u.exec(xml)?.[1];
  if (pane) { const rows = Number(attribute(pane, "ySplit")); const columns = Number(attribute(pane, "xSplit")); if (rows > 0) sheet.frozenRows = rows; if (columns > 0) sheet.frozenColumns = columns; }
  return sheet;
}

interface SheetDescriptor { id: string; name: string; path: string; hidden?: boolean }

function parseSheetDescriptors(xml: string, relationships: Map<string, string>): SheetDescriptor[] {
  return [...xml.matchAll(/<sheet\b([^>]*)\/?\s*>/gu)].map((match, index) => {
    const attributes = match[1]!;
    const relationship = attribute(attributes, "r:id");
    const target = relationship ? relationships.get(relationship) : undefined;
    if (!target) throw new Error(SPREADSHEET_ERRORS.INVALID_XLSX);
    return { id: `sheet-${index + 1}`, name: decodeXml(attribute(attributes, "name") ?? `Sheet ${index + 1}`), path: normalizeXlsxTarget(target), ...(attribute(attributes, "state") === "hidden" ? { hidden: true } : {}) };
  });
}

function boundedUnzip(bytes: Uint8Array): Record<string, Uint8Array> {
  if (bytes.byteLength === 0 || bytes.byteLength > SPREADSHEET_LIMITS.MAX_ARCHIVE_BYTES) throw new Error(SPREADSHEET_ERRORS.LIMIT_EXCEEDED);
  let entries = 0, expanded = 0;
  try {
    const files = unzipSync(bytes, { filter: (file) => {
      entries += 1; expanded += file.originalSize;
      if (entries > SPREADSHEET_LIMITS.MAX_ARCHIVE_ENTRIES || file.originalSize > SPREADSHEET_LIMITS.MAX_ENTRY_BYTES || expanded > SPREADSHEET_LIMITS.MAX_ARCHIVE_BYTES || unsafePath(file.name)) throw new Error(SPREADSHEET_ERRORS.LIMIT_EXCEEDED);
      return true;
    } });
    if (!files[XLSX_PATHS.CONTENT_TYPES]) throw new Error(SPREADSHEET_ERRORS.INVALID_XLSX);
    return files;
  } catch (error) {
    if (error instanceof Error && Object.values(SPREADSHEET_ERRORS).includes(error.message as typeof SPREADSHEET_ERRORS[keyof typeof SPREADSHEET_ERRORS])) throw error;
    throw new Error(SPREADSHEET_ERRORS.INVALID_XLSX, { cause: error });
  }
}

function parseRelationships(xml: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/>/gu)) {
    const id = attribute(match[1]!, "Id"), target = attribute(match[1]!, "Target");
    if (id && target) result.set(id, target);
  }
  return result;
}

function parseSharedStrings(bytes: Uint8Array | undefined): string[] {
  if (!bytes) return [];
  return [...strFromU8(bytes).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gu)].map((match) => [...match[1]!.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gu)].map((part) => decodeXml(part[1]!)).join(""));
}

function restoreSnapshot(xml: string, fingerprint: string): SpreadsheetWorkbook | null {
  if (attribute(xml, "worksheetFingerprint") !== fingerprint) return null;
  const json = /<disnote:json>([\s\S]*?)<\/disnote:json>/u.exec(xml)?.[1];
  if (!json) return null;
  try { return assertWorkbook(JSON.parse(decodeXml(json)) as SpreadsheetWorkbook); } catch { return null; }
}

function snapshotXml(workbook: SpreadsheetWorkbook, fingerprint: string): string { return `${XML_HEADER}<disnote:workbook xmlns:disnote="https://disnote.app/ns/spreadsheet" worksheetFingerprint="${fingerprint}"><disnote:json>${escapeXml(JSON.stringify(workbook))}</disnote:json></disnote:workbook>`; }
function workbookXml(workbook: SpreadsheetWorkbook): string { return `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${workbook.sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rIdSheet${index + 1}"${sheet.hidden ? ' state="hidden"' : ""}/>`).join("")}</sheets></workbook>`; }
function workbookRelationships(count: number): string { return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${Array.from({ length: count }, (_, index) => `<Relationship Id="rIdSheet${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdDisNoteWorkbook" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="../customXml/disnote-workbook.xml"/></Relationships>`; }
function contentTypes(count: number): string { return `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${Array.from({ length: count }, (_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`; }
function rootRelationships(): string { return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`; }
function stylesXml(): string { return `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`; }
function coreProperties(workbook: SpreadsheetWorkbook): string { return `${XML_HEADER}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(workbook.title)}</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">${escapeXml(workbook.metadata.createdAt)}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${escapeXml(workbook.metadata.updatedAt)}</dcterms:modified></cp:coreProperties>`; }
function appProperties(names: string[]): string { return `${XML_HEADER}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>DisNote Sheets</Application><TitlesOfParts><vt:vector xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes" size="${names.length}" baseType="lpstr">${names.map((name) => `<vt:lpstr>${escapeXml(name)}</vt:lpstr>`).join("")}</vt:vector></TitlesOfParts></Properties>`; }

function parseCsv(source: string, delimiter: string): string[][] {
  const rows: string[][] = [[]];
  let value = "", quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') { value += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"' && value === "") quoted = true;
    else if (character === delimiter) { rows.at(-1)!.push(value); value = ""; }
    else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      rows.at(-1)!.push(value); value = "";
      if (index < source.length - 1) rows.push([]);
    } else value += character;
  }
  if (quoted) throw new Error(SPREADSHEET_ERRORS.INVALID_CSV);
  rows.at(-1)!.push(value);
  return rows;
}

function inferScalar(value: string): CellScalar { if (/^(true|false)$/iu.test(value)) return value.toLowerCase() === "true"; if (/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u.test(value) && Number.isFinite(Number(value))) return Number(value); return value; }
function escapeCsv(value: string, delimiter: string): string { return value.includes(delimiter) || /["\r\n]/u.test(value) ? `"${value.replace(/"/gu, '""')}"` : value; }
function escapeXml(value: string): string { return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;").replace(/'/gu, "&apos;"); }
function decodeXml(value: string): string { return value.replace(/&quot;/gu, '"').replace(/&apos;/gu, "'").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&amp;/gu, "&"); }
function attribute(source: string, name: string): string | undefined { const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"); return new RegExp(`(?:^|\\s)${escaped}="([^"]*)"`, "u").exec(source)?.[1]; }
function elementText(source: string, name: string): string | undefined { return new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "u").exec(source)?.[1]; }
function normalizeXlsxTarget(target: string): string { const normalized = target.replace(/\\/gu, "/").replace(/^\.\//u, ""); if (unsafePath(normalized)) throw new Error(SPREADSHEET_ERRORS.INVALID_XLSX); return normalized.startsWith("xl/") ? normalized : `xl/${normalized}`; }
function unsafePath(path: string): boolean { const normalized = path.replace(/\\/gu, "/"); return normalized.startsWith("/") || /^[A-Za-z]:/u.test(normalized) || normalized.split("/").includes(".."); }
function compareAddresses(left: string, right: string): number { const a = parseCellAddress(left), b = parseCellAddress(right); return a.row - b.row || a.column - b.column; }
function parseWorkbookTitle(bytes: Uint8Array | undefined): string | undefined { if (!bytes) return undefined; const value = /<dc:title>([\s\S]*?)<\/dc:title>/u.exec(strFromU8(bytes))?.[1]; return value ? decodeXml(value) : undefined; }
function xlsxFingerprint(workbookXmlSource: string, worksheets: readonly string[], styles: string, sharedStrings: string): string { return sha256Hex([workbookXmlSource, ...worksheets, styles, sharedStrings].join("\u0000")); }
