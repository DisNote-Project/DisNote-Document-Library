import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentEditor, DocumentView, createDocument, paragraph, text } from "../../src/react/index.js";
import { DocumentRenderer, defaultTheme } from "../../src/renderer-react/index.js";
import { createDefaultRegistry } from "../../src/core/index.js";
test("quick editor is server-renderable before loading its browser runtime", () => {
  const html = renderToStaticMarkup(<DocumentEditor locale="vi" />);
  assert.match(html, /role="status"/); assert.match(html, /Đang tải/);
  assert.doesNotMatch(html, /contenteditable|bn-editor/);
});
test("quick React view uses a default registry and preserves the CSS contract", () => {
  const document = createDocument({ blocks: [paragraph([text("Readable")])] });
  const html = renderToStaticMarkup(<DocumentView document={document} className="consumer" appearance="dark" style={{ "--disnote-font-size": "21px" }} />);
  assert.match(html, /class="disnote-document consumer"/);
  assert.match(html, /data-disnote-surface="renderer"/);
  assert.match(html, /data-disnote-theme="dark"/);
  assert.match(html, /--disnote-font-size:21px/);
  assert.match(html, /<p>Readable<\/p>/);
  assert.doesNotMatch(html, /background:#ffffff/);
});
test("explicit renderer theme maps to tokens and per-instance style wins", () => {
  const document = createDocument({ blocks: [paragraph([text("Themed")])] });
  const html = renderToStaticMarkup(<DocumentRenderer document={document} registry={createDefaultRegistry()} theme={{ colors: { ...defaultTheme.colors, text: "navy" } }} style={{ "--disnote-text": "purple" }} />);
  assert.match(html, /--disnote-text:purple/); assert.doesNotMatch(html, /--disnote-text:navy/);
  assert.match(html, /color:var\(--disnote-text\)/); assert.match(html, /background:var\(--disnote-background\)/);
  const sibling = renderToStaticMarkup(<DocumentView document={document} />);
  assert.doesNotMatch(sibling, /purple|navy/);
});
