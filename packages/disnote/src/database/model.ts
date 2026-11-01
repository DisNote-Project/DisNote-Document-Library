export const PROPERTY_TYPES = {
  TEXT: "text", NUMBER: "number", CHECKBOX: "checkbox", DATE: "date",
  SELECT: "select", MULTI_SELECT: "multiSelect", PERSON: "person",
  RELATION: "relation", FORMULA: "formula", ROLLUP: "rollup",
  STATUS: "status", URL: "url", EMAIL: "email", PHONE: "phone",
} as const;
export const DATABASE_ERRORS = {
  DENIED: "database-access-denied", INVALID: "invalid-database-value",
  MISSING: "database-not-found", CONFLICT: "database-revision-conflict",
  CYCLE: "computed-property-cycle", LIMIT: "database-query-limit",
} as const;
export type CellValue = string | number | boolean | null | string[];
export const DATABASE_FILTER_OPERATORS = ["equal", "notEqual", "contains", "notContains", "greater", "greaterOrEqual", "less", "lessOrEqual", "empty", "notEmpty", "before", "after"] as const;
export const FORMULA_OPERATORS = ["add", "subtract", "multiply", "divide", "concat", "equal", "greater", "and", "or", "not", "less", "modulo", "power", "abs", "sqrt", "round", "floor", "ceil", "min", "max", "average", "lower", "upper", "trim", "length", "contains", "replace", "split", "join", "at", "slice", "empty", "dateAdd", "dateBetween"] as const;
export type FormulaOperator = typeof FORMULA_OPERATORS[number];
export type Formula =
  | { kind: "literal"; value: CellValue }
  | { kind: "property"; propertyId: string }
  | { kind: "if"; condition: Formula; yes: Formula; no: Formula }
  | { kind: "operation"; operator: FormulaOperator; args: Formula[] };
export interface DatabaseProperty {
  id: string;
  name: string;
  type: typeof PROPERTY_TYPES[keyof typeof PROPERTY_TYPES];
  options?: string[];
  dateFormat?: "date" | "datetime";
  targetDatabaseId?: string;
  formula?: Formula;
  rollup?: { relationId: string; propertyId: string; aggregate: "count" | "sum" | "average" | "min" | "max" };
}
export interface DatabaseRecord {
  id: string;
  pageId?: string;
  parentId?: string;
  dependencies?: string[];
  values: Record<string, CellValue>;
}
export interface DatabaseSnapshot {
  /** Internal durable automation state. Public queries omit it. */
  automation?: import("./automation/model.js").DatabaseAutomationState;
  views?: DatabaseSavedView[];
  taskSchedule?: DatabaseTaskSchedule;
  id: string;
  title: string;
  revision: number;
  properties: DatabaseProperty[];
  records: DatabaseRecord[];
}
export interface DatabaseTaskSchedule { startPropertyId: string; endPropertyId?: string; autoShift: boolean; avoidWeekends?: boolean }
export const DATABASE_VIEW_KINDS = ["table", "board", "list", "gallery", "calendar", "timeline", "map", "chart", "form"] as const;
export type DatabaseViewKind = typeof DATABASE_VIEW_KINDS[number];
export interface DatabaseSavedView {
  id: string; name: string; kind: DatabaseViewKind; query?: DatabaseQuery;
  groupPropertyId?: string; datePropertyId?: string; endDatePropertyId?: string;
  columns?: { propertyId: string; width: number; hidden?: boolean }[];
  chart?: DatabaseChartQuery;
  chartStyle?: "bar" | "line" | "donut";
  form?: { fields: { propertyId: string; required: boolean }[] };
}
export type DatabaseCommand =
  | { kind: "task"; recordId: string; parentId?: string | null; addDependencies?: string[]; removeDependencies?: string[] }
  | { kind: "schedule"; schedule: DatabaseTaskSchedule | null }
  | { kind: "patch"; recordId: string; values: Record<string, CellValue> }
  | { kind: "delete"; recordId: string }
  | { kind: "move"; recordId: string; beforeId: string | null }
  | { kind: "properties"; properties: DatabaseProperty[] }
  | { kind: "view"; view: DatabaseSavedView }
  | { kind: "deleteView"; viewId: string };
export interface DatabaseChartQuery {
  groupPropertyId: string; valuePropertyId?: string;
  aggregate: "count" | "sum" | "average" | "min" | "max";
  filter?: DatabaseFilter;
}
export interface DatabaseChartResult { revision: number; groups: { label: string; value: number; count: number }[] }
export interface DatabaseRepository {
  read(id: string): Promise<DatabaseSnapshot | null>;
  /** Atomic compare-and-swap. expectedRevision=null means insert only. */
  write(snapshot: DatabaseSnapshot, expectedRevision: number | null): Promise<boolean>;
}
export interface DatabasePolicy {
  canAssignPerson?(actor: string, databaseId: string, personId: string): Promise<boolean>;
  assert(actor: string, databaseId: string, action: "read" | "write" | "manage"): Promise<void>;
  canReadRecord(actor: string, databaseId: string, record: DatabaseRecord): Promise<boolean>;
  canWriteRecord(actor: string, databaseId: string, before: DatabaseRecord | null, after: DatabaseRecord | null): Promise<boolean>;
}
export interface DatabaseMutationResult { id: string; revision: number }
export type DatabaseFilter =
  | { kind: "all" | "any"; filters: DatabaseFilter[] }
  | { kind: "condition"; propertyId: string; operator: typeof DATABASE_FILTER_OPERATORS[number]; value?: CellValue };
export interface DatabaseQuery {
  search?: string;
  parentId?: string | null;
  dependsOn?: string;
  filter?: DatabaseFilter;
  sort?: { propertyId: string; direction: "asc" | "desc" }[];
  groupBy?: string;
  offset?: number;
  limit?: number;
}
export interface DatabaseQueryResult {
  database: Omit<DatabaseSnapshot, "records" | "automation">;
  records: DatabaseRecord[];
  total: number;
  groups: { key: string; records: DatabaseRecord[] }[];
}
