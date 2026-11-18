import type { SPREADSHEET_SCHEMA_VERSION } from "./constants.js";

export type CellScalar = string | number | boolean | null;
export type CellAddress = string;

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  fillColor?: string;
  horizontalAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  wrap?: boolean;
  numberFormat?: string;
}

export interface SpreadsheetCell {
  value?: CellScalar;
  formula?: string;
  style?: CellStyle;
  note?: string;
}

export interface SheetDimension {
  index: number;
  size?: number;
  hidden?: boolean;
}

export interface CellRange {
  start: CellAddress;
  end: CellAddress;
}

export interface Worksheet {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  cells: Record<CellAddress, SpreadsheetCell>;
  rows?: SheetDimension[];
  columns?: SheetDimension[];
  mergedCells?: CellRange[];
  frozenRows?: number;
  frozenColumns?: number;
  hidden?: boolean;
}

export interface WorkbookMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  tags?: string[];
  custom?: Record<string, string | number | boolean | null>;
}

export interface SpreadsheetWorkbook {
  schemaVersion: typeof SPREADSHEET_SCHEMA_VERSION;
  id: string;
  revision: number;
  title: string;
  locale: string;
  activeSheetId: string;
  sheets: Worksheet[];
  metadata: WorkbookMetadata;
}

export interface CreateWorkbookInput {
  id: string;
  title: string;
  locale?: string;
  now?: string;
  actor?: string;
  sheets?: Worksheet[];
}

export interface SpreadsheetDiagnostic {
  code: string;
  message: string;
  sheetId?: string;
  address?: string;
}
