import assert from "node:assert/strict";
import test from "node:test";

import {
  addSheet,
  clearCell,
  createSpreadsheetPluginRegistry,
  createWorkbook,
  createWorksheet,
  evaluateCell,
  evaluateFormula,
  removeSheet,
  renameSheet,
  setCell,
  validateWorkbook,
} from "../src/index.js";

const NOW = "2026-11-15T00:00:00.000Z";

test("workbook mutations are immutable and enforce sheet/address invariants", () => {
  const source = createWorkbook({ id: "book", title: "Budget", now: NOW });
  const changed = setCell(source, source.activeSheetId, "b2", { value: 42 }, { now: NOW });
  assert.equal(source.sheets[0]?.cells.B2, undefined);
  assert.equal(changed.sheets[0]?.cells.B2?.value, 42);
  assert.equal(changed.revision, 2);
  const second = addSheet(changed, createWorksheet({ id: "summary", name: "Summary" }), { now: NOW });
  const renamed = renameSheet(second, "summary", "Overview", { now: NOW });
  assert.equal(renamed.sheets[1]?.name, "Overview");
  assert.equal(removeSheet(renamed, "summary", { now: NOW }).sheets.length, 1);
  assert.throws(() => removeSheet(source, source.activeSheetId), /spreadsheet-last-sheet/u);
  assert.throws(() => setCell(source, source.activeSheetId, "XFE1", { value: 1 }), /spreadsheet-invalid-address/u);
  assert.equal(validateWorkbook(clearCell(changed, source.activeSheetId, "B2", { now: NOW })).ok, true);
});

test("formula engine evaluates references, ranges, comparisons and lazy conditions without eval", () => {
  let workbook = createWorkbook({ id: "formula", title: "Formula", now: NOW });
  const sheet = workbook.activeSheetId;
  workbook = setCell(workbook, sheet, "A1", { value: 10 }, { now: NOW });
  workbook = setCell(workbook, sheet, "A2", { value: 20 }, { now: NOW });
  workbook = setCell(workbook, sheet, "A3", { formula: "=SUM(A1:A2)" }, { now: NOW });
  workbook = setCell(workbook, sheet, "B1", { formula: "=IF(A3>=30,ROUND(A3/3,2),1/0)" }, { now: NOW });
  workbook = addSheet(workbook, createWorksheet({ id: "other", name: "Other Sheet" }), { now: NOW });
  workbook = setCell(workbook, "other", "A1", { formula: "='Sheet 1'!A3+5" }, { now: NOW });
  assert.deepEqual(evaluateCell(workbook, sheet, "A3"), { value: 30 });
  assert.deepEqual(evaluateCell(workbook, sheet, "B1"), { value: 10 });
  assert.deepEqual(evaluateCell(workbook, "other", "A1"), { value: 35 });
  assert.deepEqual(evaluateFormula(workbook, sheet, "=CONCAT(\"Total: \",A3)"), { value: "Total: 30" });
});

test("formula cycles and unsafe/unknown expressions fail closed", () => {
  let workbook = createWorkbook({ id: "cycle", title: "Cycle", now: NOW });
  const sheet = workbook.activeSheetId;
  workbook = setCell(workbook, sheet, "A1", { formula: "=B1" }, { now: NOW });
  workbook = setCell(workbook, sheet, "B1", { formula: "=A1" }, { now: NOW });
  assert.equal(evaluateCell(workbook, sheet, "A1").error, "#CYCLE!");
  assert.equal(evaluateFormula(workbook, sheet, "=UNKNOWN(1)").error, "#NAME?");
  assert.equal(evaluateFormula(workbook, sheet, "=1/0").error, "#DIV/0!");
  assert.equal(evaluateFormula(workbook, sheet, "=globalThis.process").error, "#NAME?");
});

test("plugins add isolated formula functions and reject conflicts", () => {
  const registry = createSpreadsheetPluginRegistry([{ id: "finance", formulaFunctions: { DOUBLE: (arguments_) => Number(arguments_[0]) * 2 } }]);
  const workbook = createWorkbook({ id: "plugin", title: "Plugin", now: NOW });
  assert.deepEqual(evaluateFormula(workbook, workbook.activeSheetId, "=DOUBLE(21)", { functions: registry.formulaFunctions }), { value: 42 });
  assert.throws(() => createSpreadsheetPluginRegistry([{ id: "a", formulaFunctions: { X: () => 1 } }, { id: "b", formulaFunctions: { x: () => 2 } }]), /spreadsheet-plugin-function-conflict/u);
});
