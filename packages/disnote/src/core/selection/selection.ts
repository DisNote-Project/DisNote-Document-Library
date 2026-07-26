import type { DisNoteDocument, DisNoteBlock, BlockSelection } from "../model/document.js";
import type { JsonValue } from "../model/json.js";

/** Traverse block tree in preorder and collect flat list of all blocks. */
function flattenBlocks(blocks: DisNoteBlock[]): DisNoteBlock[] {
  const result: DisNoteBlock[] = [];
  function visit(b: DisNoteBlock) {
    result.push(b);
    if (b.children) {
      for (const child of b.children) {
        visit(child);
      }
    }
  }
  for (const b of blocks) {
    visit(b);
  }
  return result;
}

/** Get all blocks that are selected in the range anchor <-> focus (inclusive). */
export function getBlocksInRange(doc: DisNoteDocument, selection: BlockSelection): DisNoteBlock[] {
  const flat = flattenBlocks(doc.blocks);
  const anchorIdx = flat.findIndex(b => b.id === selection.anchorBlockId);
  const focusIdx = flat.findIndex(b => b.id === selection.focusBlockId);
  if (anchorIdx === -1 || focusIdx === -1) return [];

  const start = Math.min(anchorIdx, focusIdx);
  const end = Math.max(anchorIdx, focusIdx);
  return flat.slice(start, end + 1);
}

/** Remove select blocks from a block tree recursively. */
function removeBlocksFromTree(blocks: DisNoteBlock[], idsToRemove: Set<string>): DisNoteBlock[] {
  return blocks
    .filter(b => !idsToRemove.has(b.id))
    .map(b => {
      if (b.children && b.children.length > 0) {
        return {
          ...b,
          children: removeBlocksFromTree(b.children, idsToRemove)
        };
      }
      return b;
    });
}

/** Delete all blocks within the selection range. */
export function deleteBlocksInRange(doc: DisNoteDocument, selection: BlockSelection): DisNoteDocument {
  const selected = getBlocksInRange(doc, selection);
  if (selected.length === 0) return doc;

  const idsToRemove = new Set(selected.map(b => b.id));
  return {
    ...doc,
    blocks: removeBlocksFromTree(doc.blocks, idsToRemove),
    metadata: {
      ...doc.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}

/** Update block properties and/or type recursively in tree. */
function updateBlocksInTree(
  blocks: DisNoteBlock[],
  idsToUpdate: Set<string>,
  newType: string,
  newProps?: Record<string, JsonValue>
): DisNoteBlock[] {
  return blocks.map(b => {
    let current = b;
    if (idsToUpdate.has(b.id)) {
      current = {
        ...b,
        type: newType,
        props: newProps ? { ...b.props, ...newProps } : b.props
      };
    }
    if (current.children && current.children.length > 0) {
      return {
        ...current,
        children: updateBlocksInTree(current.children, idsToUpdate, newType, newProps)
      };
    }
    return current;
  });
}

/** Bulk update block types and properties within selection range. */
export function changeBlocksTypeInRange(
  doc: DisNoteDocument,
  selection: BlockSelection,
  newType: string,
  newProps?: Record<string, JsonValue>
): DisNoteDocument {
  const selected = getBlocksInRange(doc, selection);
  if (selected.length === 0) return doc;

  const idsToUpdate = new Set(selected.map(b => b.id));
  return {
    ...doc,
    blocks: updateBlocksInTree(doc.blocks, idsToUpdate, newType, newProps),
    metadata: {
      ...doc.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}
