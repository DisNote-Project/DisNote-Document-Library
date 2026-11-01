import type { DisNoteBlock } from "../core/index.js";
export const EDITOR_EXTENSION_ERRORS = { INVALID: "invalid-editor-insert-command", DUPLICATE: "duplicate-editor-insert-command" } as const;
/** Labels belong to the host dictionary. Factories return canonical blocks, never vendor nodes. */
export interface EditorInsertCommand {
  id: string;
  title: string;
  description?: string;
  group?: string;
  keywords?: string[];
  create(): DisNoteBlock;
}
export function validateEditorInsertCommands(commands: readonly EditorInsertCommand[]): void {
  const ids = new Set<string>();
  for (const command of commands) {
    if (!command || typeof command.id !== "string" || !command.id.trim() || typeof command.title !== "string" || !command.title.trim() || typeof command.create !== "function"
      || (command.keywords !== undefined && (!Array.isArray(command.keywords) || command.keywords.some(keyword => typeof keyword !== "string")))) throw new Error(EDITOR_EXTENSION_ERRORS.INVALID);
    if (ids.has(command.id)) throw new Error(EDITOR_EXTENSION_ERRORS.DUPLICATE);
    ids.add(command.id);
  }
}
