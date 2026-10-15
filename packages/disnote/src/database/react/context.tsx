import { createContext, type ReactNode } from "react";
import type { DatabaseQuery, DatabaseQueryResult, DatabaseRecord } from "../model.js";
export interface DatabaseViewProvider {
  query(id: string, query: DatabaseQuery): Promise<DatabaseQueryResult>;
  upsertRecord?(id: string, record: DatabaseRecord, revision: number): Promise<void>;
  deleteRecord?(id: string, recordId: string, revision: number): Promise<void>;
  createId?(): string;
}
export const DatabaseViewContext = createContext<DatabaseViewProvider | null>(null);
export function DatabaseProvider({ provider, children }: { provider: DatabaseViewProvider; children: ReactNode }): ReactNode {
  return <DatabaseViewContext.Provider value={provider}>{children}</DatabaseViewContext.Provider>;
}
