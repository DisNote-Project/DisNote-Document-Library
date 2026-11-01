import { createContext, type ReactNode } from "react";
import { DatabaseCustomizationProvider, type DatabaseCustomization } from "./customization.js";
import type { DatabaseQuery, DatabaseQueryResult, DatabaseRecord, DatabaseCommand, DatabaseChartQuery, DatabaseChartResult, CellValue } from "../model.js";
export interface DatabaseViewProvider {
  automation?: import("../automation/model.js").DatabaseAutomationProvider;
  searchPeople?(query: string): Promise<{ id: string; label: string }[]>;
  subscribe?(id: string, listener: () => void): () => void;
  mutate?(id: string, commands: DatabaseCommand[], revision: number): Promise<void>;
  aggregate?(id: string, query: DatabaseChartQuery): Promise<DatabaseChartResult>;
  submitForm?(id: string, viewId: string, recordId: string, values: Record<string, CellValue>, revision: number): Promise<void>;
  query(id: string, query: DatabaseQuery, options?: { signal?: AbortSignal }): Promise<DatabaseQueryResult>;
  upsertRecord?(id: string, record: DatabaseRecord, revision: number): Promise<void>;
  deleteRecord?(id: string, recordId: string, revision: number): Promise<void>;
  createId?(): string;
}
export const DatabaseViewContext = createContext<DatabaseViewProvider | null>(null);
export function DatabaseProvider({ provider, customization, children }: { provider: DatabaseViewProvider; customization?: DatabaseCustomization; children: ReactNode }): ReactNode {
  const content = <DatabaseViewContext.Provider value={provider}>{children}</DatabaseViewContext.Provider>;
  return customization ? <DatabaseCustomizationProvider value={customization}>{content}</DatabaseCustomizationProvider> : content;
}
