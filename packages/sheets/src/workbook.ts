import { normalizeCellAddress, parseCellAddress } from "./address.js";
import { SPREADSHEET_ERRORS, SPREADSHEET_LIMITS, SPREADSHEET_SCHEMA_VERSION } from "./constants.js";
import type { CreateWorkbookInput, SpreadsheetCell, SpreadsheetWorkbook, Worksheet } from "./model.js";
import { assertWorkbook } from "./validation.js";

export interface WorkbookMutationOptions {
  now?: string;
  actor?: string;
}

export function createWorkbook(input: CreateWorkbookInput): SpreadsheetWorkbook {
  const now = input.now ?? new Date().toISOString();
  const sheets = input.sheets?.length ? structuredClone(input.sheets) : [createWorksheet({ id: "sheet-1", name: "Sheet 1" })];
  return assertWorkbook({
    schemaVersion: SPREADSHEET_SCHEMA_VERSION,
    id: input.id,
    revision: 1,
    title: input.title,
    locale: input.locale ?? "en",
    activeSheetId: sheets[0]!.id,
    sheets,
    metadata: { createdAt: now, updatedAt: now, ...(input.actor ? { createdBy: input.actor, updatedBy: input.actor } : {}) },
  });
}

export function createWorksheet(input: { id: string; name: string; rowCount?: number; columnCount?: number }): Worksheet {
  return { id: input.id, name: input.name, rowCount: input.rowCount ?? 1_000, columnCount: input.columnCount ?? 26, cells: {} };
}

export function setCell(workbook: SpreadsheetWorkbook, sheetId: string, address: string, cell: SpreadsheetCell, options: WorkbookMutationOptions = {}): SpreadsheetWorkbook {
  const normalized = normalizeCellAddress(address);
  const coordinate = parseCellAddress(normalized);
  return mutate(workbook, options, (draft) => {
    const sheet = requireSheet(draft, sheetId);
    sheet.rowCount = Math.max(sheet.rowCount, coordinate.row);
    sheet.columnCount = Math.max(sheet.columnCount, coordinate.column);
    sheet.cells[normalized] = structuredClone(cell);
  });
}

export function clearCell(workbook: SpreadsheetWorkbook, sheetId: string, address: string, options: WorkbookMutationOptions = {}): SpreadsheetWorkbook {
  const normalized = normalizeCellAddress(address);
  return mutate(workbook, options, (draft) => { delete requireSheet(draft, sheetId).cells[normalized]; });
}

export function addSheet(workbook: SpreadsheetWorkbook, sheet: Worksheet, options: WorkbookMutationOptions = {}): SpreadsheetWorkbook {
  if (workbook.sheets.length >= SPREADSHEET_LIMITS.MAX_SHEETS) throw new Error(SPREADSHEET_ERRORS.LIMIT_EXCEEDED);
  return mutate(workbook, options, (draft) => { draft.sheets.push(structuredClone(sheet)); });
}

export function renameSheet(workbook: SpreadsheetWorkbook, sheetId: string, name: string, options: WorkbookMutationOptions = {}): SpreadsheetWorkbook {
  return mutate(workbook, options, (draft) => { requireSheet(draft, sheetId).name = name; });
}

export function removeSheet(workbook: SpreadsheetWorkbook, sheetId: string, options: WorkbookMutationOptions = {}): SpreadsheetWorkbook {
  if (workbook.sheets.length === 1) throw new Error(SPREADSHEET_ERRORS.LAST_SHEET);
  return mutate(workbook, options, (draft) => {
    const index = draft.sheets.findIndex((sheet) => sheet.id === sheetId);
    if (index < 0) throw new Error(SPREADSHEET_ERRORS.SHEET_NOT_FOUND);
    draft.sheets.splice(index, 1);
    if (draft.activeSheetId === sheetId) draft.activeSheetId = draft.sheets[0]!.id;
  });
}

export function setActiveSheet(workbook: SpreadsheetWorkbook, sheetId: string, options: WorkbookMutationOptions = {}): SpreadsheetWorkbook {
  return mutate(workbook, options, (draft) => { requireSheet(draft, sheetId); draft.activeSheetId = sheetId; });
}

export function getCell(workbook: SpreadsheetWorkbook, sheetId: string, address: string): SpreadsheetCell | undefined {
  const cell = requireSheet(workbook, sheetId).cells[normalizeCellAddress(address)];
  return cell ? structuredClone(cell) : undefined;
}

export function findSheet(workbook: SpreadsheetWorkbook, idOrName: string): Worksheet | undefined {
  const normalized = idOrName.toLocaleLowerCase();
  return workbook.sheets.find((sheet) => sheet.id === idOrName || sheet.name.toLocaleLowerCase() === normalized);
}

function mutate(workbook: SpreadsheetWorkbook, options: WorkbookMutationOptions, operation: (draft: SpreadsheetWorkbook) => void): SpreadsheetWorkbook {
  const draft = structuredClone(workbook);
  operation(draft);
  draft.revision += 1;
  draft.metadata.updatedAt = options.now ?? new Date().toISOString();
  if (options.actor) draft.metadata.updatedBy = options.actor;
  return assertWorkbook(draft);
}

function requireSheet(workbook: SpreadsheetWorkbook, sheetId: string): Worksheet {
  const sheet = workbook.sheets.find((candidate) => candidate.id === sheetId);
  if (!sheet) throw new Error(SPREADSHEET_ERRORS.SHEET_NOT_FOUND);
  return sheet;
}
