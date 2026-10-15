import React, { lazy, Suspense, useState } from "react";
import {
  createDocument,
  heading,
  paragraph,
  text,
  type DisNoteDocument,
} from "@disnote/core";
import { DocumentRenderer } from "@disnote/core/renderer/react";
import { articleRegistry } from "@disnote/core";
import { PARITY_ROUTES } from "./parity/constants.js";

const EditorPanel = lazy(() => import("./EditorPanel.js"));
const ParityLab = lazy(() => import("./ParityLab.js").then(module => ({ default: module.ParityLab })));
const MobileEditorLab = lazy(() => import("./parity/MobileEditorLab.js").then(module => ({ default: module.MobileEditorLab })));

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
  if (window.location.pathname === PARITY_ROUTES.LAB) return <Suspense fallback={null}><ParityLab /></Suspense>;
  if (window.location.pathname === PARITY_ROUTES.MOBILE) return <Suspense fallback={null}><MobileEditorLab /></Suspense>;

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
