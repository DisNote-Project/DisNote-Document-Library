import type { WorkspaceAction, WorkspaceRepository, WorkspaceSnapshot } from "../workspace/index.js";
import type { DatabaseMutationResult, DatabaseRecord, DatabaseRepository, DatabaseSnapshot } from "../database/index.js";
export const ACTION_ERRORS = { INVALID: "invalid-document-actions", CONFLICT: "document-action-conflict", MISSING: "document-action-state-not-found" } as const;
export type DocumentButtonAction =
  | { kind: "workspace"; action: WorkspaceAction }
  | { kind: "upsertRecord"; databaseId: string; record: DatabaseRecord }
  | { kind: "deleteRecord"; databaseId: string; recordId: string };
export interface ButtonActionReceipt { revision: number; changedDatabases: string[] }
export interface ButtonActionState {
  id: string;
  revision: number;
  workspace: WorkspaceSnapshot;
  databases: DatabaseSnapshot[];
  receipts: Record<string, { fingerprint: string; receipt: ButtonActionReceipt }>;
}
export interface ButtonTransactionRepository {
  read(id: string): Promise<ButtonActionState | null>;
  write(state: ButtonActionState, expectedRevision: number): Promise<boolean>;
}
export interface ButtonActionPolicy { assert(actor: string, id: string): Promise<void> }
export interface ButtonDomainFactories {
  workspace(repository: WorkspaceRepository): { execute(actor: string, id: string, expectedRevision: number, actions: WorkspaceAction[]): Promise<number> };
  database(repository: DatabaseRepository): {
    upsertRecord(actor: string, id: string, record: DatabaseRecord, expectedRevision: number): Promise<DatabaseMutationResult>;
    deleteRecord(actor: string, id: string, recordId: string, expectedRevision: number): Promise<DatabaseMutationResult>;
  };
}
