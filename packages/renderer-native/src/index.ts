import type { DisNoteBlock, DisNoteDocument } from "@disnote/document-core";
import { extractInlineText } from "@disnote/document-core";

export {
  DocumentNativeRenderer,
  type DocumentNativeRendererProps,
  type NativeRendererPrimitives,
  type NativeBlockRendererApi,
  type NativeBlockRenderers,
} from "./DocumentNativeRenderer.js";

export interface NativeTextRun {
  blockId: string;
  type: string;
  text: string;
  depth: number;
}

/**
 * Platform-neutral projection for search, accessibility previews and consumers
 * that do not need the full native component renderer.
 */
export function projectForNative(document: DisNoteDocument): NativeTextRun[] {
  const runs: NativeTextRun[] = [];
  const walk = (blocks: DisNoteBlock[], depth: number): void => {
    for (const block of blocks) {
      runs.push({
        blockId: block.id,
        type: block.type,
        text: extractInlineText(block.content),
        depth,
      });
      if (block.children) walk(block.children, depth + 1);
    }
  };
  walk(document.blocks, 0);
  return runs;
}
