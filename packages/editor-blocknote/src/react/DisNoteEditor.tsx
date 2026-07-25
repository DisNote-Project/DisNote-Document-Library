/**
 * <DisNoteEditor> — the public editor facade.
 *
 * This module requires BlockNote (@blocknote/core, @blocknote/react) and React
 * as peer dependencies. It is built separately from the pure adapter (see
 * tsconfig.react.json) so a read-only consumer never needs the editor bundle.
 *
 * The facade deliberately does NOT expose the BlockNote editor object from its
 * stable surface. Advanced integrations can reach it through the guarded
 * `ExperimentalEditorAccess` escape hatch, which carries no stability guarantee.
 */
import { useImperativeHandle, useMemo, useRef, forwardRef, type ReactElement, type Ref } from "react";
import { BlockNoteViewRaw, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
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
  onDocumentChange?: (document: DisNoteDocument) => void;
  className?: string;
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
      if (bn) editor.insertBlocks([bn as never], editor.document[editor.document.length - 1] as never, "after");
    },
    setEditable: (editable: boolean) => editor.isEditable = editable,
  }));

  return (
    <div className={props.className ?? "disnote-editor"}>
      <BlockNoteViewRaw
        editor={editor}
        editable={props.editable ?? true}
        onChange={() => props.onDocumentChange?.(readCurrentDocument())}
      />
    </div>
  );
}

export const DisNoteEditor = forwardRef(DisNoteEditorImpl);
