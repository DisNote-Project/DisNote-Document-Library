export const PROPERTY_TYPES = {
  TEXT: "text", NUMBER: "number", CHECKBOX: "checkbox", DATE: "date",
  SELECT: "select", MULTI_SELECT: "multiSelect", PERSON: "person",
  RELATION: "relation", FORMULA: "formula", ROLLUP: "rollup",
} as const;
export const DATABASE_ERRORS = {
  DENIED: "database-access-denied", INVALID: "invalid-database-value",
  MISSING: "database-not-found", CONFLICT: "database-revision-conflict",
  CYCLE: "computed-property-cycle", LIMIT: "database-query-limit",
} as const;
export type CellValue = string | number | boolean | null | string[];
export type Formula =
  | { kind: "literal"; value: CellValue }
  | { kind: "property"; propertyId: string }
  | { kind: "if"; condition: Formula; yes: Formula; no: Formula }
  | { kind: "operation"; operator: "add" | "subtract" | "multiply" | "divide" | "concat" | "equal" | "greater" | "and" | "or"; args: Formula[] };
export interface DatabaseProperty {
  id: string;
  name: string;
  type: typeof PROPERTY_TYPES[keyof typeof PROPERTY_TYPES];
  options?: string[];
  targetDatabaseId?: string;
  formula?: Formula;
  rollup?: { relationId: string; propertyId: string; aggregate: "count" | "sum" | "average" | "min" | "max" };
}
export interface DatabaseRecord {
  id: string;
  pageId?: string;
  values: Record<string, CellValue>;
}
export interface DatabaseSnapshot {
  id: string;
  title: string;
  revision: number;
  properties: DatabaseProperty[];
  records: DatabaseRecord[];
}
export interface DatabaseRepository {
  read(id: string): Promise<DatabaseSnapshot | null>;
  /** Atomic compare-and-swap. expectedRevision=null means insert only. */
  write(snapshot: DatabaseSnapshot, expectedRevision: number | null): Promise<boolean>;
}
export interface DatabasePolicy {
  assert(actor: string, databaseId: string, action: "read" | "write" | "manage"): Promise<void>;
  canReadRecord(actor: string, databaseId: string, record: DatabaseRecord): Promise<boolean>;
  canWriteRecord(actor: string, databaseId: string, before: DatabaseRecord | null, after: DatabaseRecord | null): Promise<boolean>;
}
export interface DatabaseMutationResult { id: string; revision: number }
export type DatabaseFilter =
  | { kind: "all" | "any"; filters: DatabaseFilter[] }
  | { kind: "condition"; propertyId: string; operator: "equal" | "contains" | "greater" | "less" | "empty"; value?: CellValue };
export interface DatabaseQuery {
  filter?: DatabaseFilter;
  sort?: { propertyId: string; direction: "asc" | "desc" }[];
  groupBy?: string;
  offset?: number;
  limit?: number;
}
export interface DatabaseQueryResult {
  database: Omit<DatabaseSnapshot, "records">;
  records: DatabaseRecord[];
  total: number;
  groups: { key: string; records: DatabaseRecord[] }[];
}
