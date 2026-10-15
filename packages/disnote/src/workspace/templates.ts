import { createId, createDocumentId, type DisNoteBlock, type DisNoteDocument } from "../core/index.js";
/** Clone IDs recursively; references to external entities retain their identity. */
export function instantiateTemplate(template: DisNoteDocument, options: { id?: string; title?: string; now?: string } = {}): DisNoteDocument {
  const clone = structuredClone(template);
  const blocks = (items: DisNoteBlock[]): DisNoteBlock[] => items.map(item => {
    const id = createId();
    return { ...item, id, ...(item.children ? { children: blocks(item.children) } : {}) };
  });
  clone.blocks = blocks(clone.blocks); clone.id = options.id ?? createDocumentId();
  const now = options.now ?? new Date().toISOString();
  clone.metadata = { ...clone.metadata, createdAt: now, updatedAt: now, ...(options.title !== undefined ? { title: options.title } : {}) };
  return clone;
}
