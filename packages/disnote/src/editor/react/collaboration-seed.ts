import { BlockNoteEditor } from '@blocknote/core';
import { blocksToYDoc } from '@blocknote/core/yjs';
import * as Y from 'yjs';
import type { DisNoteDocument } from '../../core/index.js';
import { createBlockNoteAdapter } from '../adapter/adapter.js';
import { disNoteBlockNoteSchema } from './schema.js';
/** Browser-only initial seed. Never use it to rehydrate an existing collaborative document. */
export function createEditorCollaborationSeed(document: DisNoteDocument): Uint8Array {
  const blocks = createBlockNoteAdapter().toEditor(document).blocks;
  const editor = BlockNoteEditor.create({ schema: disNoteBlockNoteSchema, initialContent: blocks.length ? blocks as never : undefined });
  try {
    const seed = blocksToYDoc(editor, editor.document, 'editor');
    try { return Y.encodeStateAsUpdate(seed); } finally { seed.destroy(); }
  } finally { editor._tiptapEditor.destroy(); }
}
