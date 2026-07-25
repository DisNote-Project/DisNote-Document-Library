import type { DocumentStatus } from "../../storage/index.js";

/** Domain rules for content/legal publishing. Pure — no I/O. */

export interface AuditEvent {
  action: "create" | "save-draft" | "publish" | "unpublish" | "archive";
  actor: string;
  documentId: string;
  revision?: number;
  at: string;
}

export function canPublish(status: DocumentStatus): boolean {
  return status !== "archived";
}

export function canEdit(status: DocumentStatus): boolean {
  return status !== "archived";
}

/**
 * Legal documents require an effective date at publish time; it is stored in
 * document metadata attributes (not in block content).
 */
export function requiresEffectiveDate(kind: string): boolean {
  return kind === "LEGAL_POLICY";
}

export function readEffectiveDate(attributes: Record<string, unknown> | undefined): string | null {
  const value = attributes?.["effectiveDate"];
  return typeof value === "string" ? value : null;
}
