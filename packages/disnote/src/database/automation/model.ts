import type { CellValue, DatabaseFilter, DatabaseMutationResult, DatabaseRecord, DatabaseRepository } from "../model.js";
export const AUTOMATION_ERRORS = { INVALID: "invalid-database-automation", DENIED: "database-automation-denied", CONFLICT: "database-automation-conflict", MISSING: "database-automation-not-found", EFFECT: "database-automation-effect-failed" } as const;
export const AUTOMATION_LIMITS = { RULES: 50, ACTIONS: 10, JOBS: 1000, HISTORY: 200, ATTEMPTS: 5, LEASE_MS: 30000, MIN_INTERVAL_MINUTES: 1 } as const;
export type AutomationTrigger = { kind: "created" | "updated" } | { kind: "propertyChanged"; propertyId: string } | { kind: "schedule"; startAt: string; intervalMinutes?: number };
export type AutomationAction = { kind: "patch" | "createRecord"; values: Record<string, CellValue> } | { kind: "webhook"; targetId: string; propertyIds: string[] };
export interface DatabaseAutomationRule { id: string; name: string; enabled: boolean; trigger: AutomationTrigger; condition?: DatabaseFilter; actions: AutomationAction[] }
export interface OwnedAutomationRule extends DatabaseAutomationRule { actor: string; version: string; nextAt?: string; pendingRun?: { at: string; recordIds: string[]; offset: number } }
export type AutomationJobStatus = "queued" | "running" | "retry" | "succeeded" | "failed" | "cancelled";
export interface DatabaseAutomationJob {
  id: string; ruleId: string; ruleVersion: string; actor: string; recordId: string;
  status: AutomationJobStatus; step: number; attempts: number; createdAt: string; nextAt: string;
  lease?: { token: string; until: string }; error?: string;
}
export interface DatabaseAutomationState { rules: OwnedAutomationRule[]; jobs: DatabaseAutomationJob[] }
export interface DatabaseAutomationSummary { revision: number; rules: DatabaseAutomationRule[]; jobs: Omit<DatabaseAutomationJob, "actor" | "lease" | "ruleVersion">[] }
export interface DatabaseAutomationProvider {
  read(databaseId: string): Promise<DatabaseAutomationSummary & { targets?: { id: string; label: string }[] }>;
  configure(databaseId: string, rules: DatabaseAutomationRule[], revision: number): Promise<void>;
  retry(databaseId: string, jobId: string, revision: number): Promise<void>;
}
export interface AutomationDomain {
  record(actor: string, databaseId: string, recordId: string, action?: "read" | "write"): Promise<{ record: DatabaseRecord }>;
  mutate(actor: string, databaseId: string, commands: { kind: "patch"; recordId: string; values: Record<string, CellValue> }[], revision: number): Promise<DatabaseMutationResult>;
  upsertRecord(actor: string, databaseId: string, record: DatabaseRecord, revision: number): Promise<DatabaseMutationResult>;
}
export interface AutomationDependencies {
  domain(actor: string, repository: DatabaseRepository): Promise<AutomationDomain> | AutomationDomain;
  assert(actor: string, databaseId: string, action: "read" | "manage"): Promise<void>;
  webhook?(targetId: string, payload: { eventId: string; databaseId: string; recordId: string; values: Record<string, CellValue> }, idempotencyKey: string): Promise<void>;
  now?(): number;
  nonce?(): string;
}
