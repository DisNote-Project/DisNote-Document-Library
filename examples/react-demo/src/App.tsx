import React, { lazy, Suspense, useState } from "react";
import {
  createDocument,
  heading,
  paragraph,
  text,
  type DisNoteDocument,
} from "@disnote/document-core";
import { DocumentRenderer } from "@disnote/renderer-react";
import { articleRegistry } from "@disnote/document-core";

const EditorPanel = lazy(() => import("./EditorPanel.js"));

const initialDocument = createDocument({
  metadata: { title: "Demo" },
  blocks: [
    heading(1, [text("DisNote Document demo")]),
    paragraph([text("Edit on the left. The right side renders the same document with no editor.")]),
  ],
});

export function App(): JSX.Element {
  const [doc, setDoc] = useState<DisNoteDocument>(initialDocument);
  const [dark, setDark] = useState(false);

  return (
    <main className="demo-grid">
      <section data-testid="editor-panel">
        <h2>Editor</h2>
        <Suspense fallback={<p data-testid="editor-loading">Loading editor...</p>}>
          <EditorPanel initialDocument={initialDocument} onDocumentChange={setDoc} />
        </Suspense>
        <button type="button" onClick={() => setDark((d) => !d)}>Toggle theme</button>
      </section>
      <section data-testid="rendered-panel">
        <h2>Rendered (no editor)</h2>
        <DocumentRenderer
          document={doc}
          registry={articleRegistry}
          theme={dark ? darkTheme : undefined}
        />
        <h3>Document JSON</h3>
        <pre style={{ maxHeight: 300, overflow: "auto", background: "#f5f7f7", padding: 8 }}>
          {JSON.stringify(doc, null, 2)}
        </pre>
      </section>
    </main>
  );
}

const darkTheme = {
  colors: {
    background: "#111315",
    surface: "#1a1c1c",
    text: "#e8eaea",
    textMuted: "#9aa4a4",
    border: "#2b2f2f",
    focus: "#2dd4bf",
    selection: "#134e4a",
    link: "#2dd4bf",
    danger: "#f87171",
  },
};
