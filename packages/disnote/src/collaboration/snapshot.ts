import type { BlockRegistry, DisNoteDocument } from "../core/index.js";
import { checksum, extractDocumentPlainText, validateDocument } from "../core/index.js";

export interface StableRevision {
  document: DisNoteDocument;
  plainText: string;
  checksum: string;
  source: "editor" | "migration" | "import" | "api";
}

export type SnapshotResult =
  | { ok: true; revision: StableRevision }
  | { ok: false; issues: unknown[] };

/**
 * Convert a stable collaborative snapshot (already materialized as a
 * DisNoteDocument) into an immutable revision. Presence is never included.
 * Guideline section 23.5.
 */
export function snapshotToRevision(document: DisNoteDocument, registry: BlockRegistry): SnapshotResult {
  const validation = validateDocument(document, { registry });
  if (!validation.ok) return { ok: false, issues: validation.issues };
  return {
    ok: true,
    revision: {
      document: validation.value,
      plainText: extractDocumentPlainText(validation.value, registry),
      checksum: checksum(validation.value),
      source: "editor",
    },
  };
}
