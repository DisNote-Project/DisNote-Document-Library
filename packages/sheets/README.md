# @disnote/sheets

Headless spreadsheet engine for standalone product integration. It does not
depend on the DisNote document model, React, an editor vendor or a database
driver.

```ts
import { createWorkbook, setCell, evaluateCell } from "@disnote/sheets";

let workbook = createWorkbook({ id: "budget", title: "Budget" });
const sheetId = workbook.activeSheetId;
workbook = setCell(workbook, sheetId, "A1", { value: 10 });
workbook = setCell(workbook, sheetId, "A2", { value: 20 });
workbook = setCell(workbook, sheetId, "A3", { formula: "=SUM(A1:A2)" });

console.log(evaluateCell(workbook, sheetId, "A3"));
```

Use the import/export and persistence subpaths when those capabilities are
needed. UI packages should adapt this model instead of placing spreadsheet state
inside a document block.
