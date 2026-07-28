import { LIBRARY_MESSAGES } from "../core/messages.js";
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
export function validateOperations(
  document: DisNoteDocument,
  ops: AIDocumentOperation[]
): OperationIssue[] {
  const issues: OperationIssue[] = [];
  let current = document;
  ops.forEach((op, index) => {
    const ids = new Set(collectBlockIds(current));
    const beforeCount = issues.length;
    switch (op.kind) {
      case "insert": {
        const insertedIds = collectBlockIds({ ...current, blocks: [op.block] });
        const localIds = new Set<string>();
        for (const id of insertedIds) {
          if (ids.has(id) || localIds.has(id)) {
            issues.push({
              index,
              code: "duplicate-id",
              message: LIBRARY_MESSAGES.duplicateBlockId(id),
            });
          }
          localIds.add(id);
        }
        if (op.parentId !== undefined && !ids.has(op.parentId)) {
          issues.push({
            index,
            code: "parent-not-found",
            message: LIBRARY_MESSAGES.parentNotFound(op.parentId),
          });
        }
        break;
      }
      case "update":
      case "remove":
      case "move":
        if (!ids.has(op.blockId))
          issues.push({
            index,
            code: "block-not-found",
            message: LIBRARY_MESSAGES.blockNotFound(op.blockId),
          });
        if (
          op.kind === "move" &&
          op.parentId !== undefined &&
          !ids.has(op.parentId)
        ) {
          issues.push({
            index,
            code: "parent-not-found",
            message: LIBRARY_MESSAGES.parentNotFound(op.parentId),
          });
        }
        break;
    }
    if (issues.length === beforeCount) {
      const applied = applyOne(current, op);
      if (applied.ok) current = applied.document;
    }
  });
  return issues;
}

export type ApplyResult =
  | { ok: true; document: DisNoteDocument; changedBlockIds: string[] }
  | { ok: false; failedIndex: number; error: string };

/** Apply operations sequentially. Aborts on the first failing op (no partial commit). */
export function applyOperations(
  document: DisNoteDocument,
  ops: AIDocumentOperation[]
): ApplyResult {
  let current = document;
  const changed = new Set<string>();
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!;
    const result = applyOne(current, op);
    if (!result.ok)
      return { ok: false, failedIndex: i, error: result.error.message };
    current = result.document;
    for (const id of result.changedBlockIds) changed.add(id);
  }
  return { ok: true, document: current, changedBlockIds: [...changed] };
}

function applyOne(document: DisNoteDocument, op: AIDocumentOperation) {
  return op.kind === "insert"
    ? insertBlock(document, buildInsert(op))
    : op.kind === "update"
    ? updateBlock(document, op.blockId, op.patch)
    : op.kind === "remove"
    ? removeBlock(document, op.blockId)
    : moveBlock(document, op.blockId, buildMove(op));
}

function buildInsert(op: Extract<AIDocumentOperation, { kind: "insert" }>) {
  const input: { block: DisNoteBlock; parentId?: string; index?: number } = {
    block: op.block,
  };
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
  change: "added" | "removed" | "changed" | "moved";
}

/** A block-level diff between two documents (for AI preview before confirm). */
export function previewDiff(
  before: DisNoteDocument,
  after: DisNoteDocument
): DiffEntry[] {
  const beforeIds = collectBlockIds(before);
  const afterIds = collectBlockIds(after);
  const beforeSet = new Set(beforeIds);
  const afterSet = new Set(afterIds);
  const diff: DiffEntry[] = [];
  const beforeLocations = blockLocations(before);
  const afterLocations = blockLocations(after);

  for (const id of afterIds)
    if (!beforeSet.has(id)) diff.push({ blockId: id, change: "added" });
  for (const id of beforeIds)
    if (!afterSet.has(id)) diff.push({ blockId: id, change: "removed" });
  for (const id of afterIds) {
    if (!beforeSet.has(id)) continue;
    const a = findBlock(before, id);
    const b = findBlock(after, id);
    if (a && b && blockChecksum(a) !== blockChecksum(b))
      diff.push({ blockId: id, change: "changed" });
    const beforeLocation = beforeLocations.get(id);
    const afterLocation = afterLocations.get(id);
    if (
      beforeLocation &&
      afterLocation &&
      (beforeLocation.parentId !== afterLocation.parentId ||
        beforeLocation.index !== afterLocation.index)
    ) {
      diff.push({ blockId: id, change: "moved" });
    }
  }
  return diff;
}

function blockLocations(
  document: DisNoteDocument
): Map<string, { parentId: string | null; index: number }> {
  const locations = new Map<
    string,
    { parentId: string | null; index: number }
  >();
  const walk = (blocks: DisNoteBlock[], parentId: string | null): void => {
    blocks.forEach((block, index) => {
      locations.set(block.id, { parentId, index });
      if (block.children) walk(block.children, block.id);
    });
  };
  walk(document.blocks, null);
  return locations;
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
