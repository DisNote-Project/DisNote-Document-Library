import type { JsonValue } from "../model/json.js";
import type { DisNoteInline } from "../model/inline.js";
import type { DisNoteBlock, DisNoteDocument } from "../model/document.js";
import { validateDocument } from "../validation/index.js";

export interface DocumentTransformError {
  code:
    | "block-not-found"
    | "parent-not-found"
    | "invalid-destination"
    | "invalid-document"
    | "not-siblings"
    | "empty-selection";
  message: string;
  blockId?: string;
}

export type TransformResult =
  | { ok: true; document: DisNoteDocument; changedBlockIds: string[] }
  | { ok: false; error: DocumentTransformError };

function withBlocks(document: DisNoteDocument, blocks: DisNoteBlock[]): DisNoteDocument {
  return { ...document, blocks };
}

function ok(document: DisNoteDocument, changedBlockIds: string[]): TransformResult {
  const validation = validateDocument(document);
  if (!validation.ok) {
    return {
      ok: false,
      error: {
        code: "invalid-document",
        message: validation.issues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join("; "),
      },
    };
  }
  return { ok: true, document, changedBlockIds };
}

function err(error: DocumentTransformError): TransformResult {
  return { ok: false, error };
}

/* --------------------------------- insert --------------------------------- */

export interface InsertBlockInput {
  block: DisNoteBlock;
  parentId?: string;
  index?: number;
}

function insertInto(list: DisNoteBlock[], block: DisNoteBlock, index?: number): DisNoteBlock[] {
  const at = index === undefined ? list.length : Math.max(0, Math.min(index, list.length));
  return [...list.slice(0, at), block, ...list.slice(at)];
}

export function insertBlock(document: DisNoteDocument, input: InsertBlockInput): TransformResult {
  if (input.parentId === undefined) {
    return ok(withBlocks(document, insertInto(document.blocks, input.block, input.index)), [input.block.id]);
  }
  let inserted = false;
  const recurse = (blocks: DisNoteBlock[]): DisNoteBlock[] =>
    blocks.map((b) => {
      if (b.id === input.parentId) {
        inserted = true;
        return { ...b, children: insertInto(b.children ?? [], input.block, input.index) };
      }
      return b.children ? { ...b, children: recurse(b.children) } : b;
    });
  const blocks = recurse(document.blocks);
  if (!inserted) return err({ code: "parent-not-found", message: `parent "${input.parentId}" not found`, blockId: input.parentId });
  return ok(withBlocks(document, blocks), [input.block.id]);
}

export function appendBlock(document: DisNoteDocument, block: DisNoteBlock): TransformResult {
  return insertBlock(document, { block });
}

/* --------------------------------- update --------------------------------- */

export interface BlockPatch {
  type?: string;
  version?: number;
  props?: Record<string, JsonValue>;
  content?: DisNoteInline[];
  children?: DisNoteBlock[];
}

export function updateBlock(document: DisNoteDocument, blockId: string, patch: BlockPatch): TransformResult {
  let changed = false;
  const recurse = (blocks: DisNoteBlock[]): DisNoteBlock[] =>
    blocks.map((b) => {
      if (b.id === blockId) {
        changed = true;
        return { ...b, ...patch, id: b.id };
      }
      return b.children ? { ...b, children: recurse(b.children) } : b;
    });
  const blocks = recurse(document.blocks);
  if (!changed) return err({ code: "block-not-found", message: `block "${blockId}" not found`, blockId });
  return ok(withBlocks(document, blocks), [blockId]);
}

export function replaceBlock(document: DisNoteDocument, blockId: string, replacement: DisNoteBlock): TransformResult {
  let changed = false;
  const recurse = (blocks: DisNoteBlock[]): DisNoteBlock[] =>
    blocks.map((b) => {
      if (b.id === blockId) {
        changed = true;
        return replacement;
      }
      return b.children ? { ...b, children: recurse(b.children) } : b;
    });
  const blocks = recurse(document.blocks);
  if (!changed) return err({ code: "block-not-found", message: `block "${blockId}" not found`, blockId });
  return ok(withBlocks(document, blocks), [blockId, replacement.id]);
}

/* --------------------------------- remove --------------------------------- */

function removeFrom(blocks: DisNoteBlock[], id: string): { blocks: DisNoteBlock[]; removed: DisNoteBlock | null } {
  const out: DisNoteBlock[] = [];
  let removed: DisNoteBlock | null = null;
  for (const b of blocks) {
    if (b.id === id) {
      removed = b;
      continue;
    }
    if (b.children) {
      const r = removeFrom(b.children, id);
      if (r.removed) {
        removed = r.removed;
        out.push({ ...b, children: r.blocks });
        continue;
      }
    }
    out.push(b);
  }
  return { blocks: out, removed };
}

export function removeBlock(document: DisNoteDocument, blockId: string): TransformResult {
  const r = removeFrom(document.blocks, blockId);
  if (!r.removed) return err({ code: "block-not-found", message: `block "${blockId}" not found`, blockId });
  return ok(withBlocks(document, r.blocks), [blockId]);
}

/* ---------------------------------- move ---------------------------------- */

export interface MoveDestination {
  parentId?: string;
  index?: number;
}

export function moveBlock(document: DisNoteDocument, blockId: string, destination: MoveDestination): TransformResult {
  const r = removeFrom(document.blocks, blockId);
  if (!r.removed) return err({ code: "block-not-found", message: `block "${blockId}" not found`, blockId });
  if (destination.parentId === blockId) {
    return err({ code: "invalid-destination", message: "cannot move a block into itself", blockId });
  }
  const afterRemove = withBlocks(document, r.blocks);
  const insertInput: InsertBlockInput = { block: r.removed };
  if (destination.parentId !== undefined) insertInput.parentId = destination.parentId;
  if (destination.index !== undefined) insertInput.index = destination.index;
  return insertBlock(afterRemove, insertInput);
}

/* ---------------------------------- wrap ---------------------------------- */

export function wrapBlocks(document: DisNoteDocument, blockIds: string[], wrapper: DisNoteBlock): TransformResult {
  if (blockIds.length === 0) return err({ code: "empty-selection", message: "no blocks to wrap" });
  const idSet = new Set(blockIds);
  let done = false;

  const recurse = (blocks: DisNoteBlock[]): DisNoteBlock[] => {
    const indices = blocks.map((b, i) => (idSet.has(b.id) ? i : -1)).filter((i) => i >= 0);
    if (indices.length === blockIds.length && !done) {
      const first = indices[0]!;
      const last = indices[indices.length - 1]!;
      const contiguous = last - first + 1 === indices.length;
      if (contiguous) {
        done = true;
        const selected = blocks.slice(first, last + 1);
        const wrapped: DisNoteBlock = { ...wrapper, children: [...(wrapper.children ?? []), ...selected] };
        return [...blocks.slice(0, first), wrapped, ...blocks.slice(last + 1)];
      }
    }
    return blocks.map((b) => (b.children ? { ...b, children: recurse(b.children) } : b));
  };

  const blocks = recurse(document.blocks);
  if (!done) return err({ code: "not-siblings", message: "blocks to wrap must be contiguous siblings" });
  return ok(withBlocks(document, blocks), [wrapper.id, ...blockIds]);
}

/* ----------------------------------- map ---------------------------------- */

/** Immutably map every block. The mapper must return a block (may change props/content). */
export function mapBlocks(document: DisNoteDocument, mapper: (block: DisNoteBlock) => DisNoteBlock): DisNoteDocument {
  const recurse = (blocks: DisNoteBlock[]): DisNoteBlock[] =>
    blocks.map((b) => {
      const mapped = mapper(b);
      return mapped.children ? { ...mapped, children: recurse(mapped.children) } : mapped;
    });
  return withBlocks(document, recurse(document.blocks));
}
