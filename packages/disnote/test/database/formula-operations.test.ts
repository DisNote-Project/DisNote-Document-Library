import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateFormula, validateFormula, type CellValue, type FormulaOperator } from "../../src/database/index.js";
const run = (operator: FormulaOperator, values: CellValue[]) => {
  const formula = { kind: "operation" as const, operator, args: values.map(value => ({ kind: "literal" as const, value })) };
  validateFormula(formula, new Set()); return evaluateFormula(formula, async () => null);
};
test("bounded formula operations cover text, lists, arithmetic and deterministic UTC dates", async () => {
  const cases: [FormulaOperator, CellValue[], CellValue][] = [
    ["lower", ["ABC"], "abc"], ["upper", ["abc"], "ABC"], ["trim", [" a "], "a"],
    ["length", ["😀a"], 2], ["contains", [["a", "b"], "b"], true], ["replace", ["abc abc", "abc", "x"], "x x"],
    ["split", ["a,b", ","], ["a", "b"]], ["join", [["a", "b"], " / "], "a / b"],
    ["at", [["a", "b"], -1], "b"], ["at", ["abc", 9], null], ["slice", ["😀ab", 0, 2], "😀a"],
    ["not", [false], true], ["empty", [[]], true], ["less", [1, 2], true],
    ["modulo", [7, 3], 1], ["power", [2, 4], 16], ["abs", [-5], 5], ["sqrt", [9], 3],
    ["round", [2.6], 3], ["floor", [2.6], 2], ["ceil", [2.1], 3], ["min", [3, 2], 2],
    ["max", [3, 2], 3], ["average", [2, 4], 3],
    ["dateAdd", ["2026-10-17", 2], "2026-10-19T00:00:00.000Z"], ["dateBetween", ["2026-10-19", "2026-10-17"], 2],
  ];
  for (const [operator, args, expected] of cases) assert.deepEqual(await run(operator, args), expected, operator);
});
test("formula failures reject invalid arity, types, oversized output and nonfinite values", async () => {
  for (const [operator, args] of [
    ["lower", [1]], ["at", ["a", 1.2]], ["dateAdd", ["2026-10-17", 1e30]],
    ["dateBetween", ["not a date", "2026-10-17"]], ["power", [1e300, 30]],
    ["sqrt", [-1]], ["modulo", [2, 0]], ["replace", ["x", "", "y"]],
    ["split", ["x".repeat(10001), ""]], ["lower", []],
  ] as [FormulaOperator, CellValue[]][]) await assert.rejects(async () => run(operator, args));
  const formula = { kind: "if" as const, condition: { kind: "literal" as const, value: true }, yes: { kind: "literal" as const, value: "yes" }, no: { kind: "operation" as const, operator: "divide" as const, args: [{ kind: "literal" as const, value: 1 }, { kind: "literal" as const, value: 0 }] } };
  assert.equal(await evaluateFormula(formula, async () => null), "yes");
});
