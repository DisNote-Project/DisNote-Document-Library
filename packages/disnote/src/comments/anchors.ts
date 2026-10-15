import type { CommentThread } from "./model.js";
import { COMMENT_ERRORS } from "./service.js";
export interface TextEdit { blockId: string; start: number; deleteCount: number; insertLength: number }
/** Offsets use UTF-16, matching editor and JavaScript string offsets. Apply in edit order. */
export function remapCommentAnchors(threads: CommentThread[], edits: TextEdit[]): CommentThread[] {
  const result = structuredClone(threads);
  for (const edit of edits) {
    if ([edit.start, edit.deleteCount, edit.insertLength].some(n => !Number.isInteger(n) || n < 0)) throw new Error(COMMENT_ERRORS.INVALID);
    for (const thread of result) {
      const anchor = thread.anchor;
      if (anchor.type !== "inline-range" || anchor.blockId !== edit.blockId || thread.orphaned) continue;
      const deletedEnd = edit.start + edit.deleteCount;
      const map = (offset: number, end: boolean) => {
        if (offset < edit.start || (offset === edit.start && !end)) return offset;
        if (offset >= deletedEnd) return offset - edit.deleteCount + edit.insertLength;
        return edit.start + (end ? edit.insertLength : 0);
      };
      const start = map(anchor.start, false), end = map(anchor.end, true);
      anchor.start = start; anchor.end = Math.max(start, end);
      if (anchor.start === anchor.end) thread.orphaned = true;
    }
  }
  return result;
}
