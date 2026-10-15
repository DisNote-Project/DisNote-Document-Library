import { useMemo, type Ref, type ReactElement } from "react";
import { CollaborationExtension } from "@blocknote/core/yjs";
import { DisNoteEditorBase, type DisNoteEditorHandle, type DisNoteEditorProps } from "./DisNoteEditor.js";
export default function CollaborativeEditor(props: DisNoteEditorProps & { editorRef: Ref<DisNoteEditorHandle> }): ReactElement {
  const runtime = useMemo(() => ({ extensions: props.collaboration ? [CollaborationExtension(props.collaboration)] : [] }), [props.collaboration]);
  return <DisNoteEditorBase {...props} collaborationRuntime={runtime} ref={props.editorRef} />;
}
