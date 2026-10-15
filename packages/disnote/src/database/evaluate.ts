import { DATABASE_ERRORS, PROPERTY_TYPES, type CellValue, type DatabaseFilter, type DatabaseProperty, type Formula } from "./model.js";
const FORMULA_OPERATORS = new Set(["add", "subtract", "multiply", "divide", "concat", "equal", "greater", "and", "or"]);
export function validateFormula(formula: Formula, propertyIds: Set<string>, depth = 0): void {
  if (!formula || typeof formula !== "object" || depth > 32) throw new Error(DATABASE_ERRORS.INVALID);
  switch (formula.kind) {
    case "literal":
      if (formula.value !== null && typeof formula.value !== "string" && typeof formula.value !== "boolean" && !(typeof formula.value === "number" && Number.isFinite(formula.value)) && !(Array.isArray(formula.value) && formula.value.every(v => typeof v === "string"))) throw new Error(DATABASE_ERRORS.INVALID);
      return;
    case "property": if (!propertyIds.has(formula.propertyId)) throw new Error(DATABASE_ERRORS.INVALID); return;
    case "if": validateFormula(formula.condition, propertyIds, depth + 1); validateFormula(formula.yes, propertyIds, depth + 1); validateFormula(formula.no, propertyIds, depth + 1); return;
    case "operation":
      if (!FORMULA_OPERATORS.has(formula.operator) || !Array.isArray(formula.args) || formula.args.length > 100 || (["divide", "equal", "greater"].includes(formula.operator) && formula.args.length !== 2)) throw new Error(DATABASE_ERRORS.INVALID);
      for (const arg of formula.args) validateFormula(arg, propertyIds, depth + 1);
      return;
    default: throw new Error(DATABASE_ERRORS.INVALID);
  }
}
export function validateFilter(filter: DatabaseFilter, propertyIds: Set<string>, depth = 0): void {
  if (!filter || depth > 32) throw new Error(DATABASE_ERRORS.INVALID);
  if (filter.kind === "all" || filter.kind === "any") {
    if (!Array.isArray(filter.filters) || filter.filters.length > 100) throw new Error(DATABASE_ERRORS.INVALID);
    for (const nested of filter.filters) validateFilter(nested, propertyIds, depth + 1);
  } else if (filter.kind !== "condition" || !propertyIds.has(filter.propertyId) || !["equal", "contains", "greater", "less", "empty"].includes(filter.operator)) throw new Error(DATABASE_ERRORS.INVALID);
}

export function validateCell(property: DatabaseProperty, value: CellValue): boolean {
  if (value === null) return true;
  switch (property.type) {
    case PROPERTY_TYPES.TEXT: return typeof value === "string";
    case PROPERTY_TYPES.NUMBER: return typeof value === "number" && Number.isFinite(value);
    case PROPERTY_TYPES.CHECKBOX: return typeof value === "boolean";
    case PROPERTY_TYPES.DATE: return typeof value === "string" && Number.isFinite(Date.parse(value));
    case PROPERTY_TYPES.SELECT: return typeof value === "string" && (property.options ?? []).includes(value);
    case PROPERTY_TYPES.MULTI_SELECT: return Array.isArray(value) && value.every(v => typeof v === "string" && (property.options ?? []).includes(v));
    case PROPERTY_TYPES.PERSON:
    case PROPERTY_TYPES.RELATION: return Array.isArray(value) && value.every(v => typeof v === "string" && v.length > 0) && new Set(value).size === value.length;
    default: return false;
  }
}

/** Interpret a bounded AST; never execute JavaScript supplied by a document. */
export async function evaluateFormula(formula: Formula, get: (id: string) => Promise<CellValue>, depth = 0): Promise<CellValue> {
  if (depth > 32) throw new Error(DATABASE_ERRORS.CYCLE);
  if (formula.kind === "literal") return formula.value;
  if (formula.kind === "property") return get(formula.propertyId);
  if (formula.kind === "if") return evaluateFormula(await evaluateFormula(formula.condition, get, depth + 1) ? formula.yes : formula.no, get, depth + 1);
  if (formula.args.length > 100) throw new Error(DATABASE_ERRORS.LIMIT);
  const args: CellValue[] = [];
  for (const arg of formula.args) args.push(await evaluateFormula(arg, get, depth + 1));
  const numeric = () => {
    if (args.some(v => typeof v !== "number" || !Number.isFinite(v))) throw new Error(DATABASE_ERRORS.INVALID);
    return args as number[];
  };
  let result: CellValue;
  switch (formula.operator) {
    case "add": result = numeric().reduce((a, b) => a + b, 0); break;
    case "subtract": { const n = numeric(); result = n.slice(1).reduce((a, b) => a - b, n[0] ?? 0); break; }
    case "multiply": result = numeric().reduce((a, b) => a * b, 1); break;
    case "divide": { const n = numeric(); if (n.length !== 2 || n[1] === 0) throw new Error(DATABASE_ERRORS.INVALID); result = n[0]! / n[1]!; break; }
    case "concat": result = args.map(v => v === null ? "" : String(v)).join(""); break;
    case "equal": result = JSON.stringify(args[0]) === JSON.stringify(args[1]); break;
    case "greater": { const n = numeric(); result = (n[0] ?? 0) > (n[1] ?? 0); break; }
    case "and": result = args.every(Boolean); break;
    case "or": result = args.some(Boolean); break;
    default: throw new Error(DATABASE_ERRORS.INVALID);
  }
  if (typeof result === "number" && !Number.isFinite(result)) throw new Error(DATABASE_ERRORS.INVALID);
  return result;
}

export function matchesFilter(values: Record<string, CellValue>, filter: DatabaseFilter, depth = 0): boolean {
  if (depth > 32) throw new Error(DATABASE_ERRORS.LIMIT);
  if (filter.kind === "all") return filter.filters.every(f => matchesFilter(values, f, depth + 1));
  if (filter.kind === "any") return filter.filters.some(f => matchesFilter(values, f, depth + 1));
  if (filter.kind !== "condition") return false;
  const value = values[filter.propertyId] ?? null;
  switch (filter.operator) {
    case "equal": return JSON.stringify(value) === JSON.stringify(filter.value);
    case "contains": return Array.isArray(value) ? value.includes(String(filter.value)) : typeof value === "string" && value.toLocaleLowerCase().includes(String(filter.value ?? "").toLocaleLowerCase());
    case "greater": return typeof value === "number" && typeof filter.value === "number" && value > filter.value;
    case "less": return typeof value === "number" && typeof filter.value === "number" && value < filter.value;
    case "empty": return value === null || value === "" || (Array.isArray(value) && value.length === 0);
  }
}

export function compareCells(a: CellValue, b: CellValue): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}
