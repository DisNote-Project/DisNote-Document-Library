import { normalizeCellAddress, parseCellAddress, rangesOverlap } from "./address.js";
import { SPREADSHEET_ERRORS, SPREADSHEET_LIMITS, SPREADSHEET_SCHEMA_VERSION } from "./constants.js";
import type { SpreadsheetCell, SpreadsheetWorkbook, Worksheet } from "./model.js";

export interface WorkbookValidationResult {
  ok: boolean;
  issues: string[];
}

export function validateWorkbook(workbook: SpreadsheetWorkbook): WorkbookValidationResult {
  const issues: string[] = [];
  if (workbook.schemaVersion !== SPREADSHEET_SCHEMA_VERSION || !workbook.id || !workbook.title || !Number.isInteger(workbook.revision) || workbook.revision < 1) issues.push(SPREADSHEET_ERRORS.INVALID_WORKBOOK);
  if (!Array.isArray(workbook.sheets) || workbook.sheets.length < 1 || workbook.sheets.length > SPREADSHEET_LIMITS.MAX_SHEETS) issues.push(SPREADSHEET_ERRORS.INVALID_WORKBOOK);
  const ids = new Set<string>();
  const names = new Set<string>();
  let cellCount = 0;
  for (const sheet of workbook.sheets ?? []) {
    const key = sheet.name.trim().toLocaleLowerCase();
    if (!sheet.id || !sheet.name.trim() || ids.has(sheet.id) || names.has(key)) issues.push(SPREADSHEET_ERRORS.DUPLICATE_SHEET);
    ids.add(sheet.id);
    names.add(key);
    issues.push(...validateSheet(sheet));
    cellCount += Object.keys(sheet.cells).length;
  }
  if (!ids.has(workbook.activeSheetId)) issues.push(SPREADSHEET_ERRORS.INVALID_WORKBOOK);
  if (cellCount > SPREADSHEET_LIMITS.MAX_CELLS) issues.push(SPREADSHEET_ERRORS.LIMIT_EXCEEDED);
  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}

export function assertWorkbook(workbook: SpreadsheetWorkbook): SpreadsheetWorkbook {
  const result = validateWorkbook(workbook);
  if (!result.ok) throw new Error(result.issues.join(","));
  return workbook;
}

function validateSheet(sheet: Worksheet): string[] {
  const issues: string[] = [];
  if (!Number.isInteger(sheet.rowCount) || !Number.isInteger(sheet.columnCount) || sheet.rowCount < 1 || sheet.columnCount < 1 || sheet.rowCount > SPREADSHEET_LIMITS.MAX_ROWS || sheet.columnCount > SPREADSHEET_LIMITS.MAX_COLUMNS) issues.push(SPREADSHEET_ERRORS.INVALID_SHEET);
  for (const [address, cell] of Object.entries(sheet.cells)) {
    try {
      if (normalizeCellAddress(address) !== address || !validCell(cell)) issues.push(SPREADSHEET_ERRORS.INVALID_ADDRESS);
      const coordinate = parseCellAddress(address);
      if (coordinate.row > sheet.rowCount || coordinate.column > sheet.columnCount) issues.push(SPREADSHEET_ERRORS.INVALID_ADDRESS);
    } catch {
      issues.push(SPREADSHEET_ERRORS.INVALID_ADDRESS);
    }
  }
  const ranges = sheet.mergedCells ?? [];
  for (let index = 0; index < ranges.length; index += 1) {
    try {
      parseCellAddress(ranges[index]!.start);
      parseCellAddress(ranges[index]!.end);
      if (ranges.slice(index + 1).some((range) => rangesOverlap(ranges[index]!, range))) issues.push(SPREADSHEET_ERRORS.INVALID_SHEET);
    } catch {
      issues.push(SPREADSHEET_ERRORS.INVALID_SHEET);
    }
  }
  return issues;
}

function validCell(cell: SpreadsheetCell): boolean {
  if (!cell || typeof cell !== "object") return false;
  if (cell.formula !== undefined && (!cell.formula.startsWith("=") || cell.formula.length > SPREADSHEET_LIMITS.MAX_FORMULA_LENGTH)) return false;
  if (cell.value !== undefined && cell.value !== null && !["string", "number", "boolean"].includes(typeof cell.value)) return false;
  return !(typeof cell.value === "number" && !Number.isFinite(cell.value));
}
