/**
 * @disnote/editor-blocknote — the first editing adapter for DisNote Document.
 *
 * The pure conversion + adapter API is exported here and has no BlockNote
 * dependency. The React facade `<DisNoteEditor>` lives at the "./react" subpath
 * (it requires BlockNote + React as peer dependencies) so importing the adapter
 * never pulls the editor bundle into a read-only build.
 */
export {
  createBlockNoteAdapter,
  type EditorAdapter,
  type BlockNoteEditorDocument,
  type EnvelopeMeta,
  type RoundTripReport,
} from "./adapter/adapter.js";
export {
  blockToBn,
  blockFromBn,
  inlineToBn,
  inlineFromBn,
} from "./adapter/convert.js";
export type {
  BnBlock,
  BnInlineContent,
  BnStyledText,
  BnLink,
  BnStyles,
} from "./adapter/blocknote-shape.js";

// Editor UI building blocks that are framework-neutral (i18n + slash registry).
export {
  createI18n,
  defineEditorMessages,
  DEFAULT_EDITOR_LOCALE,
  EN_EDITOR_MESSAGES,
  type I18n,
  type CreateI18nOptions,
  type EditorLocale,
  type EditorDictionary,
  type EditorMessageKey,
  type EditorMessageOverrides,
} from "./i18n/dictionary.js";
export {
  defaultSlashCommands,
  filterSlashCommands,
  type SlashCommand,
} from "./slash-menu/commands.js";
