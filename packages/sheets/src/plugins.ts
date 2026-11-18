import type { FormulaFunction } from "./formula.js";
import type { SpreadsheetWorkbook } from "./model.js";

export interface SpreadsheetPlugin {
  id: string;
  formulaFunctions?: Record<string, FormulaFunction>;
  validate?: (workbook: SpreadsheetWorkbook) => readonly string[];
}

export interface SpreadsheetPluginRegistry {
  plugins: readonly SpreadsheetPlugin[];
  formulaFunctions: Readonly<Record<string, FormulaFunction>>;
  validate(workbook: SpreadsheetWorkbook): readonly string[];
}

export function createSpreadsheetPluginRegistry(plugins: readonly SpreadsheetPlugin[] = []): SpreadsheetPluginRegistry {
  const ids = new Set<string>();
  const formulaFunctions: Record<string, FormulaFunction> = {};
  for (const plugin of plugins) {
    if (!plugin.id || ids.has(plugin.id)) throw new Error("spreadsheet-plugin-invalid");
    ids.add(plugin.id);
    for (const [name, implementation] of Object.entries(plugin.formulaFunctions ?? {})) {
      const normalized = name.toUpperCase();
      if (formulaFunctions[normalized]) throw new Error("spreadsheet-plugin-function-conflict");
      formulaFunctions[normalized] = implementation;
    }
  }
  return {
    plugins: [...plugins],
    formulaFunctions: Object.freeze({ ...formulaFunctions }),
    validate: (workbook) => plugins.flatMap((plugin) => plugin.validate?.(workbook) ?? []),
  };
}
