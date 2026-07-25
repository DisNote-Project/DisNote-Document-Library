import React from "react";
import type { DisNoteDocument } from "@disnote/document-core";
import { DisNoteEditor } from "@disnote/editor-blocknote/react";

export interface EditorPanelProps {
  initialDocument: DisNoteDocument;
  onDocumentChange(document: DisNoteDocument): void;
}

export default function EditorPanel(props: EditorPanelProps): JSX.Element {
  return (
    <DisNoteEditor
      initialDocument={props.initialDocument}
      onDocumentChange={props.onDocumentChange}
      className="demo-editor"
    />
  );
}
