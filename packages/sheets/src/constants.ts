export const SPREADSHEET_SCHEMA_VERSION = 1 as const;

export const SPREADSHEET_LIMITS = {
  MAX_ROWS: 1_048_576,
  MAX_COLUMNS: 16_384,
  MAX_SHEETS: 256,
  MAX_CELLS: 1_000_000,
  MAX_FORMULA_LENGTH: 8_192,
  MAX_FORMULA_DEPTH: 64,
  MAX_FORMULA_RANGE_CELLS: 100_000,
  MAX_ARCHIVE_BYTES: 128 * 1024 * 1024,
  MAX_ARCHIVE_ENTRIES: 4_096,
  MAX_ENTRY_BYTES: 64 * 1024 * 1024,
  MAX_XML_BYTES: 32 * 1024 * 1024,
} as const;

export const SPREADSHEET_ERRORS = {
  INVALID_WORKBOOK: "spreadsheet-invalid-workbook",
  INVALID_SHEET: "spreadsheet-invalid-sheet",
  INVALID_ADDRESS: "spreadsheet-invalid-address",
  DUPLICATE_SHEET: "spreadsheet-duplicate-sheet",
  SHEET_NOT_FOUND: "spreadsheet-sheet-not-found",
  LAST_SHEET: "spreadsheet-last-sheet",
  LIMIT_EXCEEDED: "spreadsheet-limit-exceeded",
  FORMULA_PARSE: "spreadsheet-formula-parse-error",
  FORMULA_CYCLE: "spreadsheet-formula-cycle",
  FORMULA_DIV_ZERO: "spreadsheet-formula-div-zero",
  FORMULA_VALUE: "spreadsheet-formula-value-error",
  FORMULA_NAME: "spreadsheet-formula-name-error",
  FORMULA_REF: "spreadsheet-formula-ref-error",
  INVALID_XLSX: "spreadsheet-invalid-xlsx",
  INVALID_CSV: "spreadsheet-invalid-csv",
  REVISION_CONFLICT: "spreadsheet-revision-conflict",
  DUPLICATE_WORKBOOK: "spreadsheet-duplicate-workbook",
  INVALID_TABLE: "spreadsheet-invalid-table",
} as const;

export const FORMULA_ERROR_VALUES = {
  PARSE: "#PARSE!",
  CYCLE: "#CYCLE!",
  DIV_ZERO: "#DIV/0!",
  VALUE: "#VALUE!",
  NAME: "#NAME?",
  REF: "#REF!",
  LIMIT: "#LIMIT!",
} as const;

export const XLSX_PATHS = {
  CONTENT_TYPES: "[Content_Types].xml",
  ROOT_RELS: "_rels/.rels",
  WORKBOOK: "xl/workbook.xml",
  WORKBOOK_RELS: "xl/_rels/workbook.xml.rels",
  STYLES: "xl/styles.xml",
  SHARED_STRINGS: "xl/sharedStrings.xml",
} as const;
