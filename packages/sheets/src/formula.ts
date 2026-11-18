import { expandCellRange, normalizeCellAddress } from "./address.js";
import { FORMULA_ERROR_VALUES, SPREADSHEET_ERRORS, SPREADSHEET_LIMITS } from "./constants.js";
import type { CellScalar, SpreadsheetWorkbook, Worksheet } from "./model.js";
import { findSheet } from "./workbook.js";

export type FormulaValue = CellScalar | FormulaValue[];

export interface FormulaEvaluation {
  value: CellScalar;
  error?: string;
}

export interface FormulaFunctionContext {
  workbook: SpreadsheetWorkbook;
  sheetId: string;
}

export type FormulaFunction = (arguments_: readonly FormulaValue[], context: FormulaFunctionContext) => FormulaValue;

export interface FormulaEvaluationOptions {
  functions?: Readonly<Record<string, FormulaFunction>>;
}

type Expression =
  | { kind: "literal"; value: CellScalar }
  | { kind: "reference"; sheet?: string; address: string }
  | { kind: "range"; start: Extract<Expression, { kind: "reference" }>; end: Extract<Expression, { kind: "reference" }> }
  | { kind: "unary"; operator: "+" | "-" | "%"; value: Expression }
  | { kind: "binary"; operator: string; left: Expression; right: Expression }
  | { kind: "function"; name: string; arguments: Expression[] };

interface Token {
  kind: "number" | "string" | "identifier" | "reference" | "operator" | "eof";
  value: string;
}

export function evaluateCell(workbook: SpreadsheetWorkbook, sheetId: string, address: string, options: FormulaEvaluationOptions = {}): FormulaEvaluation {
  const engine = new FormulaEngine(workbook, options);
  return engine.cell(sheetId, normalizeCellAddress(address));
}

export function evaluateFormula(workbook: SpreadsheetWorkbook, sheetId: string, formula: string, options: FormulaEvaluationOptions = {}): FormulaEvaluation {
  const engine = new FormulaEngine(workbook, options);
  return engine.formula(sheetId, formula);
}

class FormulaEngine {
  private readonly active = new Set<string>();
  private readonly memo = new Map<string, FormulaEvaluation>();
  private readonly functions: Readonly<Record<string, FormulaFunction>>;

  constructor(private readonly workbook: SpreadsheetWorkbook, options: FormulaEvaluationOptions) {
    this.functions = Object.freeze(Object.fromEntries(Object.entries(options.functions ?? {}).map(([name, implementation]) => [name.toUpperCase(), implementation])));
  }

  cell(sheetId: string, address: string): FormulaEvaluation {
    const key = `${sheetId}!${address}`;
    const cached = this.memo.get(key);
    if (cached) return cached;
    if (this.active.has(key)) return { value: null, error: FORMULA_ERROR_VALUES.CYCLE };
    const sheet = this.workbook.sheets.find((candidate) => candidate.id === sheetId);
    if (!sheet) return { value: null, error: FORMULA_ERROR_VALUES.REF };
    const cell = sheet.cells[address];
    if (!cell?.formula) return { value: cell?.value ?? null };
    this.active.add(key);
    const result = this.formula(sheetId, cell.formula);
    this.active.delete(key);
    this.memo.set(key, result);
    return result;
  }

  formula(sheetId: string, formula: string): FormulaEvaluation {
    try {
      if (!formula.startsWith("=") || formula.length > SPREADSHEET_LIMITS.MAX_FORMULA_LENGTH) throw new FormulaFailure(FORMULA_ERROR_VALUES.PARSE);
      const expression = new FormulaParser(formula.slice(1)).parse();
      const value = this.evaluate(expression, sheetId, 0);
      if (Array.isArray(value)) throw new FormulaFailure(FORMULA_ERROR_VALUES.VALUE);
      return { value };
    } catch (error) {
      return { value: null, error: error instanceof FormulaFailure ? error.code : FORMULA_ERROR_VALUES.VALUE };
    }
  }

  private evaluate(expression: Expression, sheetId: string, depth: number): FormulaValue {
    if (depth > SPREADSHEET_LIMITS.MAX_FORMULA_DEPTH) throw new FormulaFailure(FORMULA_ERROR_VALUES.LIMIT);
    if (expression.kind === "literal") return expression.value;
    if (expression.kind === "reference") return this.reference(expression, sheetId);
    if (expression.kind === "range") return this.range(expression, sheetId);
    if (expression.kind === "unary") {
      const value = toNumber(this.evaluate(expression.value, sheetId, depth + 1));
      return expression.operator === "-" ? -value : expression.operator === "%" ? value / 100 : value;
    }
    if (expression.kind === "binary") return binary(expression.operator, this.evaluate(expression.left, sheetId, depth + 1), this.evaluate(expression.right, sheetId, depth + 1));
    return this.call(expression, sheetId, depth + 1);
  }

  private reference(reference: Extract<Expression, { kind: "reference" }>, currentSheetId: string): CellScalar {
    const sheet = resolveSheet(this.workbook, currentSheetId, reference.sheet);
    const result = this.cell(sheet.id, reference.address);
    if (result.error) throw new FormulaFailure(result.error);
    return result.value;
  }

  private range(range: Extract<Expression, { kind: "range" }>, currentSheetId: string): FormulaValue[] {
    const startSheet = resolveSheet(this.workbook, currentSheetId, range.start.sheet);
    const endSheet = resolveSheet(this.workbook, currentSheetId, range.end.sheet ?? range.start.sheet);
    if (startSheet.id !== endSheet.id) throw new FormulaFailure(FORMULA_ERROR_VALUES.REF);
    return expandCellRange({ start: range.start.address, end: range.end.address }).map((address) => {
      const result = this.cell(startSheet.id, address);
      if (result.error) throw new FormulaFailure(result.error);
      return result.value;
    });
  }

  private call(expression: Extract<Expression, { kind: "function" }>, sheetId: string, depth: number): FormulaValue {
    const name = expression.name.toUpperCase();
    if (name === "IF") {
      if (expression.arguments.length < 2 || expression.arguments.length > 3) throw new FormulaFailure(FORMULA_ERROR_VALUES.VALUE);
      return truthy(this.evaluate(expression.arguments[0]!, sheetId, depth))
        ? this.evaluate(expression.arguments[1]!, sheetId, depth)
        : expression.arguments[2] ? this.evaluate(expression.arguments[2], sheetId, depth) : false;
    }
    if (name === "AND" || name === "OR") {
      if (expression.arguments.length === 0) throw new FormulaFailure(FORMULA_ERROR_VALUES.VALUE);
      for (const argument of expression.arguments) {
        const value = truthy(this.evaluate(argument, sheetId, depth));
        if (name === "AND" && !value) return false;
        if (name === "OR" && value) return true;
      }
      return name === "AND";
    }
    const arguments_ = expression.arguments.map((argument) => this.evaluate(argument, sheetId, depth));
    const custom = this.functions[name];
    if (custom) return custom(arguments_, { workbook: this.workbook, sheetId });
    return builtIn(name, arguments_);
  }
}

class FormulaParser {
  private readonly tokens: Token[];
  private index = 0;

  constructor(source: string) { this.tokens = tokenize(source); }

  parse(): Expression {
    const result = this.comparison();
    if (this.peek().kind !== "eof") throw new FormulaFailure(FORMULA_ERROR_VALUES.PARSE);
    return result;
  }

  private comparison(): Expression {
    let left = this.concat();
    while (["=", "<>", "<", ">", "<=", ">="].includes(this.peek().value)) {
      const operator = this.take().value;
      left = { kind: "binary", operator, left, right: this.concat() };
    }
    return left;
  }

  private concat(): Expression {
    let left = this.addition();
    while (this.peek().value === "&") left = { kind: "binary", operator: this.take().value, left, right: this.addition() };
    return left;
  }

  private addition(): Expression {
    let left = this.multiplication();
    while (["+", "-"].includes(this.peek().value)) left = { kind: "binary", operator: this.take().value, left, right: this.multiplication() };
    return left;
  }

  private multiplication(): Expression {
    let left = this.power();
    while (["*", "/"].includes(this.peek().value)) left = { kind: "binary", operator: this.take().value, left, right: this.power() };
    return left;
  }

  private power(): Expression {
    const left = this.unary();
    return this.peek().value === "^" ? { kind: "binary", operator: this.take().value, left, right: this.power() } : left;
  }

  private unary(): Expression {
    if (["+", "-"].includes(this.peek().value)) return { kind: "unary", operator: this.take().value as "+" | "-", value: this.unary() };
    let value = this.primary();
    if (this.peek().value === "%") {
      this.take();
      value = { kind: "unary", operator: "%", value };
    }
    return value;
  }

  private primary(): Expression {
    const token = this.take();
    let expression: Expression;
    if (token.kind === "number") expression = { kind: "literal", value: Number(token.value) };
    else if (token.kind === "string") expression = { kind: "literal", value: token.value.slice(1, -1).replace(/""/gu, '"') };
    else if (token.kind === "reference") expression = parseReference(token.value);
    else if (token.kind === "identifier") {
      if (token.value.toUpperCase() === "TRUE") expression = { kind: "literal", value: true };
      else if (token.value.toUpperCase() === "FALSE") expression = { kind: "literal", value: false };
      else if (this.peek().value === "(") expression = this.functionCall(token.value);
      else throw new FormulaFailure(FORMULA_ERROR_VALUES.NAME);
    } else if (token.value === "(") {
      expression = this.comparison();
      this.expect(")");
    } else throw new FormulaFailure(FORMULA_ERROR_VALUES.PARSE);
    if (expression.kind === "reference" && this.peek().value === ":") {
      this.take();
      const end = this.take();
      if (end.kind !== "reference") throw new FormulaFailure(FORMULA_ERROR_VALUES.PARSE);
      expression = { kind: "range", start: expression, end: parseReference(end.value) };
    }
    return expression;
  }

  private functionCall(name: string): Expression {
    this.expect("(");
    const arguments_: Expression[] = [];
    if (this.peek().value !== ")") {
      do { arguments_.push(this.comparison()); } while (this.peek().value === "," && this.take());
    }
    this.expect(")");
    return { kind: "function", name, arguments: arguments_ };
  }

  private peek(): Token { return this.tokens[this.index]!; }
  private take(): Token { return this.tokens[this.index++]!; }
  private expect(value: string): void { if (this.take().value !== value) throw new FormulaFailure(FORMULA_ERROR_VALUES.PARSE); }
}

function tokenize(source: string): Token[] {
  const pattern = /\s*(?:(\d+(?:\.\d+)?)|("(?:[^"]|"")*")|('(?:[^']|'')+'!\$?[A-Za-z]{1,3}\$?[1-9][0-9]*|(?:[A-Za-z_][A-Za-z0-9_.]*!)?\$?[A-Za-z]{1,3}\$?[1-9][0-9]*)|([A-Za-z_][A-Za-z0-9_.]*)|(<>|<=|>=|[+\-*/^&%=<>:,()]))/gy;
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < source.length) {
    pattern.lastIndex = offset;
    const match = pattern.exec(source);
    if (!match || match.index !== offset) throw new FormulaFailure(FORMULA_ERROR_VALUES.PARSE);
    offset = pattern.lastIndex;
    if (match[1]) tokens.push({ kind: "number", value: match[1] });
    else if (match[2]) tokens.push({ kind: "string", value: match[2] });
    else if (match[3]) tokens.push({ kind: "reference", value: match[3] });
    else if (match[4]) tokens.push({ kind: "identifier", value: match[4] });
    else tokens.push({ kind: "operator", value: match[5]! });
  }
  tokens.push({ kind: "eof", value: "" });
  return tokens;
}

function parseReference(value: string): Extract<Expression, { kind: "reference" }> {
  const separator = value.lastIndexOf("!");
  const sheet = separator < 0 ? undefined : value.slice(0, separator).replace(/^'|'$/gu, "").replace(/''/gu, "'");
  const address = normalizeCellAddress(value.slice(separator + 1).replace(/\$/gu, ""));
  return { kind: "reference", ...(sheet ? { sheet } : {}), address };
}

function resolveSheet(workbook: SpreadsheetWorkbook, currentSheetId: string, name: string | undefined): Worksheet {
  const sheet = name ? findSheet(workbook, name) : workbook.sheets.find((candidate) => candidate.id === currentSheetId);
  if (!sheet) throw new FormulaFailure(FORMULA_ERROR_VALUES.REF);
  return sheet;
}

function binary(operator: string, left: FormulaValue, right: FormulaValue): CellScalar {
  if (Array.isArray(left) || Array.isArray(right)) throw new FormulaFailure(FORMULA_ERROR_VALUES.VALUE);
  if (operator === "&") return `${left ?? ""}${right ?? ""}`;
  if (["=", "<>", "<", ">", "<=", ">="].includes(operator)) {
    const comparison = compare(left, right);
    return operator === "=" ? comparison === 0 : operator === "<>" ? comparison !== 0 : operator === "<" ? comparison < 0 : operator === ">" ? comparison > 0 : operator === "<=" ? comparison <= 0 : comparison >= 0;
  }
  const a = toNumber(left), b = toNumber(right);
  if (operator === "+") return a + b;
  if (operator === "-") return a - b;
  if (operator === "*") return a * b;
  if (operator === "/") {
    if (b === 0) throw new FormulaFailure(FORMULA_ERROR_VALUES.DIV_ZERO);
    return a / b;
  }
  if (operator === "^") return finite(a ** b);
  throw new FormulaFailure(FORMULA_ERROR_VALUES.VALUE);
}

function builtIn(name: string, arguments_: readonly FormulaValue[]): FormulaValue {
  const values: CellScalar[] = [];
  for (const argument of arguments_) flattenValue(argument, values);
  if (name === "SUM") return finite(values.reduce<number>((sum, value) => sum + numericOrZero(value), 0));
  if (name === "AVERAGE") {
    const numbers = values.filter(isNumber);
    if (numbers.length === 0) throw new FormulaFailure(FORMULA_ERROR_VALUES.DIV_ZERO);
    return finite(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
  }
  if (name === "MIN" || name === "MAX") {
    const numbers = values.filter(isNumber);
    if (numbers.length === 0) return 0;
    return name === "MIN" ? Math.min(...numbers) : Math.max(...numbers);
  }
  if (name === "COUNT") return values.filter(isNumber).length;
  if (name === "COUNTA") return values.filter((value) => value !== null && value !== "").length;
  if (name === "NOT" && values.length === 1) return !truthy(values[0]!);
  if (name === "CONCAT") return values.map((value) => value ?? "").join("");
  if (name === "ROUND" && values.length >= 1 && values.length <= 2) {
    const digits = values[1] === undefined ? 0 : toNumber(values[1]);
    const scale = 10 ** digits;
    return finite(Math.round(toNumber(values[0]!) * scale) / scale);
  }
  throw new FormulaFailure(FORMULA_ERROR_VALUES.NAME);
}

function toNumber(value: FormulaValue): number {
  if (Array.isArray(value)) throw new FormulaFailure(FORMULA_ERROR_VALUES.VALUE);
  if (value === null || value === "") return 0;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new FormulaFailure(FORMULA_ERROR_VALUES.VALUE);
  return parsed;
}

function numericOrZero(value: CellScalar): number { return typeof value === "number" ? value : 0; }
function flattenValue(value: FormulaValue, output: CellScalar[]): void { if (Array.isArray(value)) { for (const item of value) flattenValue(item, output); } else output.push(value); }
function isNumber(value: CellScalar): value is number { return typeof value === "number" && Number.isFinite(value); }
function finite(value: number): number { if (!Number.isFinite(value)) throw new FormulaFailure(FORMULA_ERROR_VALUES.VALUE); return value; }
function truthy(value: FormulaValue): boolean { if (Array.isArray(value)) return value.some(truthy); return value !== null && value !== false && value !== 0 && value !== ""; }
function compare(left: CellScalar, right: CellScalar): number { return typeof left === "number" && typeof right === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? "")); }

class FormulaFailure extends Error {
  constructor(readonly code: string) { super(code); }
}

export function formulaErrorToCode(error: string): string {
  if (error === FORMULA_ERROR_VALUES.CYCLE) return SPREADSHEET_ERRORS.FORMULA_CYCLE;
  if (error === FORMULA_ERROR_VALUES.DIV_ZERO) return SPREADSHEET_ERRORS.FORMULA_DIV_ZERO;
  if (error === FORMULA_ERROR_VALUES.NAME) return SPREADSHEET_ERRORS.FORMULA_NAME;
  if (error === FORMULA_ERROR_VALUES.REF) return SPREADSHEET_ERRORS.FORMULA_REF;
  if (error === FORMULA_ERROR_VALUES.PARSE) return SPREADSHEET_ERRORS.FORMULA_PARSE;
  return SPREADSHEET_ERRORS.FORMULA_VALUE;
}
