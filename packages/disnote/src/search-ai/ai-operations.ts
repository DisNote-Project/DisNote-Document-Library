import type { DisNoteBlock, DisNoteDocument } from "../core/index.js";
import {
  insertBlock,
  updateBlock,
  removeBlock,
  moveBlock,
  findBlock,
  checksum,
  collectBlockIds,
  type BlockPatch,
} from "../core/index.js";

export type AIDocumentOperation =
  | { kind: "insert"; block: DisNoteBlock; parentId?: string; index?: number }
  | { kind: "update"; blockId: string; patch: BlockPatch }
  | { kind: "remove"; blockId: string }
  | { kind: "move"; blockId: string; parentId?: string; index?: number };

export interface OperationIssue {
  index: number;
  code: "block-not-found" | "parent-not-found" | "duplicate-id";
  message: string;
}

/**
 * Validate AI operations against a document WITHOUT applying them. Every op must
 * reference an existing block id (permission checks happen in the application).
 */
export function validateOperations(document: DisNoteDocument, ops: AIDocumentOperation[]): OperationIssue[] {
  const issues: OperationIssue[] = [];
  const ids = new Set(collectBlockIds(document));
  ops.forEach((op, index) => {
    switch (op.kind) {
      case "insert":
        if (ids.has(op.block.id)) issues.push({ index, code: "duplicate-id", message: `block id "${op.block.id}" already exists` });
        if (op.parentId && !ids.has(op.parentId)) issues.push({ index, code: "parent-not-found", message: `parent "${op.parentId}" not found` });
        break;
      case "update":
      case "remove":
      case "move":
        if (!ids.has(op.blockId)) issues.push({ index, code: "block-not-found", message: `block "${op.blockId}" not found` });
        if (op.kind === "move" && op.parentId && !ids.has(op.parentId)) {
          issues.push({ index, code: "parent-not-found", message: `parent "${op.parentId}" not found` });
        }
        break;
    }
  });
  return issues;
}

export type ApplyResult =
  | { ok: true; document: DisNoteDocument; changedBlockIds: string[] }
  | { ok: false; failedIndex: number; error: string };

/** Apply operations sequentially. Aborts on the first failing op (no partial commit). */
export function applyOperations(document: DisNoteDocument, ops: AIDocumentOperation[]): ApplyResult {
  let current = document;
  const changed = new Set<string>();
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!;
    const result =
      op.kind === "insert"
        ? insertBlock(current, buildInsert(op))
        : op.kind === "update"
          ? updateBlock(current, op.blockId, op.patch)
          : op.kind === "remove"
            ? removeBlock(current, op.blockId)
            : moveBlock(current, op.blockId, buildMove(op));
    if (!result.ok) return { ok: false, failedIndex: i, error: result.error.message };
    current = result.document;
    for (const id of result.changedBlockIds) changed.add(id);
  }
  return { ok: true, document: current, changedBlockIds: [...changed] };
}

function buildInsert(op: Extract<AIDocumentOperation, { kind: "insert" }>) {
  const input: { block: DisNoteBlock; parentId?: string; index?: number } = { block: op.block };
  if (op.parentId !== undefined) input.parentId = op.parentId;
  if (op.index !== undefined) input.index = op.index;
  return input;
}

function buildMove(op: Extract<AIDocumentOperation, { kind: "move" }>) {
  const dest: { parentId?: string; index?: number } = {};
  if (op.parentId !== undefined) dest.parentId = op.parentId;
  if (op.index !== undefined) dest.index = op.index;
  return dest;
}

export interface DiffEntry {
  blockId: string;
  change: "added" | "removed" | "changed";
}

/** A block-level diff between two documents (for AI preview before confirm). */
export function previewDiff(before: DisNoteDocument, after: DisNoteDocument): DiffEntry[] {
  const beforeIds = collectBlockIds(before);
  const afterIds = collectBlockIds(after);
  const beforeSet = new Set(beforeIds);
  const afterSet = new Set(afterIds);
  const diff: DiffEntry[] = [];

  for (const id of afterIds) if (!beforeSet.has(id)) diff.push({ blockId: id, change: "added" });
  for (const id of beforeIds) if (!afterSet.has(id)) diff.push({ blockId: id, change: "removed" });
  for (const id of afterIds) {
    if (!beforeSet.has(id)) continue;
    const a = findBlock(before, id);
    const b = findBlock(after, id);
    if (a && b && blockChecksum(a) !== blockChecksum(b)) diff.push({ blockId: id, change: "changed" });
  }
  return diff;
}

function blockChecksum(block: DisNoteBlock): string {
  // Reuse the document canonical checksum on a single-block envelope.
  return checksum({
    format: "disnote-document",
    schemaVersion: 1,
    id: "diff",
    metadata: { createdAt: "", updatedAt: "" },
    blocks: [{ ...block, children: [] }],
  });
}
