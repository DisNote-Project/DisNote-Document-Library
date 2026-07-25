import type { DisNoteBlock, DisNoteDocument } from "../model/document.js";

export interface BlockVisit {
  block: DisNoteBlock;
  parent: DisNoteBlock | null;
  index: number;
  depth: number;
}

/** Depth-first pre-order walk over every block in the document. O(n). */
export function visitBlocks(document: DisNoteDocument, visitor: (v: BlockVisit) => void): void {
  const walk = (blocks: DisNoteBlock[], parent: DisNoteBlock | null, depth: number): void => {
    blocks.forEach((block, index) => {
      visitor({ block, parent, index, depth });
      if (block.children && block.children.length > 0) {
        walk(block.children, block, depth + 1);
      }
    });
  };
  walk(document.blocks, null, 0);
}

/** Find the first block with the given id, or null. */
export function findBlock(document: DisNoteDocument, id: string): DisNoteBlock | null {
  let found: DisNoteBlock | null = null;
  visitBlocks(document, ({ block }) => {
    if (found === null && block.id === id) found = block;
  });
  return found;
}

/** Collect every block id in the document (in traversal order). */
export function collectBlockIds(document: DisNoteDocument): string[] {
  const ids: string[] = [];
  visitBlocks(document, ({ block }) => ids.push(block.id));
  return ids;
}

/** Maximum nesting depth of the document (0 for a flat document). */
export function maxDepth(document: DisNoteDocument): number {
  let depth = 0;
  visitBlocks(document, (v) => {
    if (v.depth > depth) depth = v.depth;
  });
  return depth;
}

/** Return ids that appear more than once. */
export function findDuplicateIds(document: DisNoteDocument): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  visitBlocks(document, ({ block }) => {
    if (seen.has(block.id)) dupes.add(block.id);
    seen.add(block.id);
  });
  return [...dupes];
}
