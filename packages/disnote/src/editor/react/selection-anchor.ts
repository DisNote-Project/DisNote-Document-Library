import { extractInlineText, visitBlocks, type DisNoteDocument } from "../../core/index.js";
import type { CommentAnchor } from "../../comments/model.js";
interface Position {
  depth: number;
  node(depth: number): { attrs: Record<string, unknown>; child(index: number): { textContent: string } };
  start(depth: number): number;
}
interface SelectionState { selection: { from: number; to: number; $from: Position; $to: Position }; doc: { textBetween(from: number, to: number, separator?: string): string } }
/** Only represent offsets when vendor text matches the canonical inline text exactly. */
export function selectionCommentAnchor(state: SelectionState, document: DisNoteDocument): CommentAnchor {
  const { selection } = state;
  for (let depth = selection.$from.depth; depth > 0; depth--) {
    const node = selection.$from.node(depth), id = node.attrs.id;
    if (typeof id !== "string") continue;
    let text: string | undefined;
    visitBlocks(document, ({ block }) => { if (block.id === id) text = extractInlineText(block.content); });
    if (text === undefined) continue;
    if (selection.from === selection.to || selection.$to.depth < depth || selection.$to.node(depth).attrs.id !== id) return { type: "block", blockId: id };
    const start = selection.$from.start(depth) + 1;
    const before = state.doc.textBetween(start, selection.from, ""), selected = state.doc.textBetween(selection.from, selection.to, "");
    if (node.child(0).textContent !== text || !selected || text.slice(before.length, before.length + selected.length) !== selected) return { type: "block", blockId: id };
    return { type: "inline-range", blockId: id, start: before.length, end: before.length + selected.length };
  }
  return { type: "document" };
}
