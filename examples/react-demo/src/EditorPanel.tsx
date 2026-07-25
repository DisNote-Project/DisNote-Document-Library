import React from "react";
import type { DisNoteDocument } from "@disnote/core";
import { DisNoteEditor } from "@disnote/core/editor/react";

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
