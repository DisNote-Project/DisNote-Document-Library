import { DATABASE_ERRORS, type CellValue, type FormulaOperator } from "./model.js";
const DAY_MS = 86400000;
/** Fixed arities bound evaluation; existing variadic arithmetic remains compatible. */
export const FORMULA_ARITY: Partial<Record<FormulaOperator, number>> = {
  divide: 2, equal: 2, greater: 2, less: 2, modulo: 2, power: 2, not: 1,
  abs: 1, sqrt: 1, round: 1, floor: 1, ceil: 1, lower: 1, upper: 1, trim: 1,
  length: 1, contains: 2, replace: 3, split: 2, join: 2, at: 2, slice: 3,
  empty: 1, dateAdd: 2, dateBetween: 2,
};
function invalid(): never { throw new Error(DATABASE_ERRORS.INVALID); }
/** Deterministic operations only: no eval, clock, locale, regex or network access. */
export function evaluateExtendedFormula(operator: FormulaOperator, args: CellValue[]): CellValue {
  if (FORMULA_ARITY[operator] !== undefined && args.length !== FORMULA_ARITY[operator]) invalid();
  const number = (at: number): number => typeof args[at] === "number" && Number.isFinite(args[at]) ? args[at] as number : invalid();
  const string = (at: number): string => typeof args[at] === "string" ? args[at] as string : invalid();
  const integer = (at: number): number => Number.isInteger(number(at)) ? number(at) : invalid();
  const date = (at: number): number => { const value = string(at); if (!/^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(value)) invalid(); const timestamp = Date.parse(value); return Number.isFinite(timestamp) ? timestamp : invalid(); };
  const numbers = () => { if (!args.length) invalid(); return args.map((_, at) => number(at)); };
  switch (operator) {
    case "not": return !args[0];
    case "less": return number(0) < number(1);
    case "modulo": return number(1) === 0 ? invalid() : number(0) % number(1);
    case "power": return number(0) ** number(1);
    case "abs": return Math.abs(number(0));
    case "sqrt": return Math.sqrt(number(0));
    case "round": return Math.round(number(0));
    case "floor": return Math.floor(number(0));
    case "ceil": return Math.ceil(number(0));
    case "min": return Math.min(...numbers());
    case "max": return Math.max(...numbers());
    case "average": return numbers().reduce((total, value) => total + value / args.length, 0);
    case "lower": return string(0).toLowerCase();
    case "upper": return string(0).toUpperCase();
    case "trim": return string(0).trim();
    case "length": return typeof args[0] === "string" ? Array.from(args[0]).length : Array.isArray(args[0]) ? args[0].length : invalid();
    case "empty": return args[0] === null || args[0] === "" || (Array.isArray(args[0]) && !args[0].length);
    case "contains": return Array.isArray(args[0]) ? args[0].includes(string(1)) : string(0).includes(string(1));
    case "replace": { const find = string(1); if (!find) invalid(); const source = string(0), replacement = string(2); if ((source.length + 1) * (replacement.length + 1) > 1000000) invalid(); return source.split(find).join(replacement); }
    case "split": { const source = string(0), separator = string(1); const result = separator ? source.split(separator) : Array.from(source); return result.length > 10000 ? invalid() : result; }
    case "join": { if (!Array.isArray(args[0])) invalid(); const separator = string(1); if (args[0].length * (separator.length + 1) > 1000000) invalid(); return args[0].join(separator); }
    case "at": { const index = integer(1), source = args[0]; if (Array.isArray(source)) return source.at(index) ?? null; if (typeof source === "string") return Array.from(source).at(index) ?? null; return invalid(); }
    case "slice": { const start = integer(1), end = integer(2), source = args[0]; if (Array.isArray(source)) return source.slice(start, end); if (typeof source === "string") return Array.from(source).slice(start, end).join(""); return invalid(); }
    case "dateAdd": { const value = date(0) + integer(1) * DAY_MS; if (!Number.isFinite(value) || Math.abs(value) > 8640000000000000) invalid(); return new Date(value).toISOString(); }
    case "dateBetween": return (date(0) - date(1)) / DAY_MS;
    default: return invalid();
  }
}
