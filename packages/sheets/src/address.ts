import { SPREADSHEET_ERRORS, SPREADSHEET_LIMITS } from "./constants.js";
import type { CellAddress, CellRange } from "./model.js";

export interface CellCoordinate {
  row: number;
  column: number;
}

const ADDRESS_PATTERN = /^\$?([A-Z]{1,3})\$?([1-9][0-9]{0,6})$/u;

export function parseCellAddress(address: CellAddress): CellCoordinate {
  const match = ADDRESS_PATTERN.exec(address.toUpperCase());
  if (!match) throw new Error(SPREADSHEET_ERRORS.INVALID_ADDRESS);
  const column = columnNameToIndex(match[1]!);
  const row = Number(match[2]);
  if (row > SPREADSHEET_LIMITS.MAX_ROWS || column > SPREADSHEET_LIMITS.MAX_COLUMNS) {
    throw new Error(SPREADSHEET_ERRORS.INVALID_ADDRESS);
  }
  return { row, column };
}

export function formatCellAddress(row: number, column: number): CellAddress {
  if (!Number.isInteger(row) || !Number.isInteger(column) || row < 1 || column < 1 || row > SPREADSHEET_LIMITS.MAX_ROWS || column > SPREADSHEET_LIMITS.MAX_COLUMNS) {
    throw new Error(SPREADSHEET_ERRORS.INVALID_ADDRESS);
  }
  return `${columnIndexToName(column)}${row}`;
}

export function normalizeCellAddress(address: CellAddress): CellAddress {
  const coordinate = parseCellAddress(address);
  return formatCellAddress(coordinate.row, coordinate.column);
}

export function expandCellRange(range: CellRange, limit = SPREADSHEET_LIMITS.MAX_FORMULA_RANGE_CELLS): CellAddress[] {
  const start = parseCellAddress(range.start);
  const end = parseCellAddress(range.end);
  const firstRow = Math.min(start.row, end.row);
  const lastRow = Math.max(start.row, end.row);
  const firstColumn = Math.min(start.column, end.column);
  const lastColumn = Math.max(start.column, end.column);
  const size = (lastRow - firstRow + 1) * (lastColumn - firstColumn + 1);
  if (size > limit) throw new Error(SPREADSHEET_ERRORS.LIMIT_EXCEEDED);
  const addresses: CellAddress[] = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) addresses.push(formatCellAddress(row, column));
  }
  return addresses;
}

export function rangesOverlap(left: CellRange, right: CellRange): boolean {
  const a1 = parseCellAddress(left.start), a2 = parseCellAddress(left.end);
  const b1 = parseCellAddress(right.start), b2 = parseCellAddress(right.end);
  const aRows = [Math.min(a1.row, a2.row), Math.max(a1.row, a2.row)];
  const aColumns = [Math.min(a1.column, a2.column), Math.max(a1.column, a2.column)];
  const bRows = [Math.min(b1.row, b2.row), Math.max(b1.row, b2.row)];
  const bColumns = [Math.min(b1.column, b2.column), Math.max(b1.column, b2.column)];
  return aRows[0]! <= bRows[1]! && bRows[0]! <= aRows[1]! && aColumns[0]! <= bColumns[1]! && bColumns[0]! <= aColumns[1]!;
}

function columnNameToIndex(name: string): number {
  let result = 0;
  for (const character of name) result = result * 26 + character.charCodeAt(0) - 64;
  return result;
}

function columnIndexToName(index: number): string {
  let value = index;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + value % 26) + result;
    value = Math.floor(value / 26);
  }
  return result;
}
