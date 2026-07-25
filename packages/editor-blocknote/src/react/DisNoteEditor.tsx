/**
 * <DisNoteEditor> — the public editor facade.
 *
 * Requires BlockNote (@blocknote/core, @blocknote/react) and a BlockNote UI
 * package (@blocknote/mantine) plus React as peer dependencies. It is built
 * separately from the pure adapter (see tsconfig.react.json) so a read-only
 * consumer never needs the editor bundle.
 *
 * The facade deliberately does NOT expose the BlockNote editor object from its
 * stable surface. Advanced integrations can reach it through the guarded
 * `ExperimentalEditorAccess` escape hatch, which carries no stability guarantee.
 */
import { useImperativeHandle, useMemo, useRef, forwardRef, type ReactElement, type Ref } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import type { DisNoteBlock, DisNoteDocument } from "@disnote/document-core";
import { createBlockNoteAdapter, type BlockNoteEditorDocument } from "../adapter/adapter.js";
import { disNoteBlockNoteSchema } from "./schema.js";

export interface DocumentCapabilities {
  canRead: boolean;
  canEdit: boolean;
  canComment: boolean;
  canPublish: boolean;
  canManage: boolean;
}

export interface DisNoteEditorHandle {
  focus(): void;
  getDocument(): DisNoteDocument;
  insertBlock(block: DisNoteBlock): void;
  setEditable(editable: boolean): void;
}

export interface ExperimentalEditorAccess {
  readonly vendor: "blocknote";
  getVendorEditor(): unknown;
}

export interface DisNoteEditorProps {
  initialDocument: DisNoteDocument;
  editable?: boolean;
  /** Visual theme for the editing surface. */
  theme?: "light" | "dark";
  onDocumentChange?: (document: DisNoteDocument) => void;
  className?: string;
}

/** Default slash menu items plus DisNote's custom blocks (callout). */
function disNoteSlashItems(editor: {
  updateBlock: unknown;
}): DefaultReactSuggestionItem[] {
  const ed = editor as never;
  const calloutItem: DefaultReactSuggestionItem = {
    title: "Callout",
    subtext: "Highlight a tip, note or warning",
    aliases: ["callout", "note", "info", "tip", "warning", "ghi chú"],
    group: "Advanced",
    icon: <span aria-hidden>💡</span>,
    onItemClick: () => {
      insertOrUpdateBlockForSlashMenu(ed, { type: "callout", props: { intent: "info" } } as never);
    },
  };
  return [...getDefaultReactSlashMenuItems(ed), calloutItem];
}

function DisNoteEditorImpl(props: DisNoteEditorProps, ref: Ref<DisNoteEditorHandle>): ReactElement {
  const adapter = useMemo(() => createBlockNoteAdapter(), []);
  const envelopeRef = useRef<BlockNoteEditorDocument["envelope"]>(
    adapter.toEditor(props.initialDocument).envelope,
  );

  const editor = useCreateBlockNote({
    schema: disNoteBlockNoteSchema,
    initialContent: adapter.toEditor(props.initialDocument).blocks as never,
  });

  const readCurrentDocument = (): DisNoteDocument =>
    adapter.fromEditor({
      blocks: editor.document as never,
      envelope: envelopeRef.current,
    });

  useImperativeHandle(ref, () => ({
    focus: () => editor.focus(),
    getDocument: readCurrentDocument,
    insertBlock: (block: DisNoteBlock) => {
      const [bn] = adapter.toEditor({ ...props.initialDocument, blocks: [block] }).blocks;
      if (!bn) return;
      const cursor = editor.getTextCursorPosition();
      const reference = cursor?.block ?? editor.document[editor.document.length - 1];
      if (reference) editor.insertBlocks([bn as never], reference as never, "after");
    },
    setEditable: (editable: boolean) => {
      editor.isEditable = editable;
    },
  }));

  return (
    <div className={props.className ?? "disnote-editor"}>
      <BlockNoteView
        editor={editor}
        editable={props.editable ?? true}
        theme={props.theme ?? "light"}
        slashMenu={false}
        onChange={() => props.onDocumentChange?.(readCurrentDocument())}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => filterSuggestionItems(disNoteSlashItems(editor), query)}
        />
      </BlockNoteView>
    </div>
  );
}

export const DisNoteEditor = forwardRef(DisNoteEditorImpl);
