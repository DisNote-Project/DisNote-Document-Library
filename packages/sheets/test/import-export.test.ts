import assert from "node:assert/strict";
import test from "node:test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

import { createWorkbook, exportCsv, exportXlsx, importCsv, importXlsx, setCell } from "../src/index.js";

const NOW = "2026-11-15T00:00:00.000Z";

test("CSV handles quoted values, multiline text, Unicode and inferred scalars", () => {
  const imported = importCsv('Name,Value,Enabled\r\n"Việt Nam, HCM","line 1\nline 2",true\r\nTotal,12.5,false', { id: "csv", title: "CSV", now: NOW });
  const sheet = imported.workbook.sheets[0]!;
  assert.equal(sheet.cells.A2?.value, "Việt Nam, HCM");
  assert.equal(sheet.cells.B2?.value, "line 1\nline 2");
  assert.equal(sheet.cells.C2?.value, true);
  assert.equal(sheet.cells.B3?.value, 12.5);
  assert.match(exportCsv(imported.workbook, sheet.id), /"Việt Nam, HCM"/u);
});

test("DisNote XLSX exact round-trip preserves canonical workbook state", () => {
  let workbook = createWorkbook({ id: "xlsx", title: "Kế hoạch", locale: "vi", now: NOW });
  const sheet = workbook.activeSheetId;
  workbook = setCell(workbook, sheet, "A1", { value: "Doanh thu", style: { bold: true, fillColor: "#00AA99" }, note: "Internal" }, { now: NOW });
  workbook = setCell(workbook, sheet, "A2", { value: 12.5 }, { now: NOW });
  workbook = setCell(workbook, sheet, "A3", { formula: "=SUM(A2,7.5)", value: 20 }, { now: NOW });
  workbook.sheets[0]!.mergedCells = [{ start: "B1", end: "C1" }];
  workbook.sheets[0]!.frozenRows = 1;
  const exported = exportXlsx(workbook);
  assert.ok(exported.bytes.byteLength > 1_000);
  assert.ok(exported.diagnostics.some((diagnostic) => diagnostic.code === "xlsx-style-snapshot-only"));
  const restored = importXlsx(exported.bytes, { now: NOW });
  assert.equal(restored.source, "embedded-canonical");
  assert.deepEqual(restored.workbook, workbook);
});

test("edited XLSX rejects stale snapshot and imports worksheet values/formulas semantically", () => {
  let workbook = createWorkbook({ id: "edited", title: "Edited", now: NOW });
  workbook = setCell(workbook, workbook.activeSheetId, "A1", { value: 10 }, { now: NOW });
  const files = unzipSync(exportXlsx(workbook).bytes);
  files["xl/worksheets/sheet1.xml"] = strToU8(strFromU8(files["xl/worksheets/sheet1.xml"]!).replace(">10<", ">25<"));
  const imported = importXlsx(zipSync(files), { id: "semantic", now: NOW });
  assert.equal(imported.source, "xlsx");
  assert.equal(imported.workbook.sheets[0]?.cells.A1?.value, 25);
  assert.ok(imported.diagnostics.some((diagnostic) => diagnostic.code === "xlsx-embedded-snapshot-stale"));
});

test("renaming a worksheet invalidates the embedded canonical snapshot", () => {
  const workbook = createWorkbook({ id: "renamed", title: "Renamed", now: NOW });
  const files = unzipSync(exportXlsx(workbook).bytes);
  files["xl/workbook.xml"] = strToU8(strFromU8(files["xl/workbook.xml"]!).replace('name="Sheet 1"', 'name="Plan 2027"'));
  const imported = importXlsx(zipSync(files), { id: "semantic-name", now: NOW });
  assert.equal(imported.source, "xlsx");
  assert.equal(imported.workbook.sheets[0]?.name, "Plan 2027");
});

test("XLSX import rejects malformed and traversal archives before acceptance", () => {
  assert.throws(() => importXlsx(new Uint8Array()), /spreadsheet-limit-exceeded/u);
  assert.throws(() => importXlsx(zipSync({ "../xl/workbook.xml": strToU8("<workbook/>") })), /spreadsheet-limit-exceeded/u);
});
