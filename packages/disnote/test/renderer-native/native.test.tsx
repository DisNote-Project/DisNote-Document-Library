import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createDocument, heading, image, paragraph, text } from "../../src/core/index.js";
import {
  DocumentNativeRenderer,
  type NativeRendererPrimitives,
} from "../../src/renderer-native/index.js";

const primitives: NativeRendererPrimitives = {
  View: ({ children }) => <div>{children}</div>,
  Text: ({ children }) => <span>{children}</span>,
  Image: ({ accessibilityLabel }) => <img alt={String(accessibilityLabel ?? "")} />,
};

test("native renderer maps core blocks through injected primitives", () => {
  const document = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [
      heading(1, [text("Title")], { id: "h" }),
      paragraph([text("Body")], { id: "p" }),
      image("asset-1", "Preview", { id: "image" }),
    ],
  });
  const html = renderToStaticMarkup(
    <DocumentNativeRenderer
      document={document}
      primitives={primitives}
      assetResolver={() => "https://cdn.example/image.png"}
    />,
  );
  assert.match(html, /Title/);
  assert.match(html, /Body/);
  assert.match(html, /alt="Preview"/);
});
