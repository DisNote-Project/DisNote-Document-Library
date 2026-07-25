import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDocument,
  heading,
  paragraph,
  bulletListItem,
  callout,
  codeBlock,
  link,
  text,
  customBlock,
  createDefaultRegistry,
} from "../../src/core/index.js";
import { renderDocumentToHtml } from "../../src/renderer-html/index.js";

const registry = createDefaultRegistry();

test("renders core blocks to semantic HTML", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [
      heading(2, [text("Title")], { id: "h" }),
      paragraph([text("Hello "), text("world", [{ type: "bold" }])], { id: "p" }),
      bulletListItem([text("one")]),
      bulletListItem([text("two")]),
      codeBlock("const x = 1;", "ts"),
    ],
  });
  const { html, headings } = renderDocumentToHtml({ document: doc, registry });
  assert.match(html, /<h2>Title<\/h2>/);
  assert.match(html, /<strong>world<\/strong>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(html, /<pre><code class="language-ts">const x = 1;<\/code><\/pre>/);
  assert.equal(headings[0]?.text, "Title");
});

test("escapes text and drops unsafe link hrefs", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [
      paragraph([text("<script>alert(1)</script>")], { id: "p1" }),
      paragraph([link("javascript:alert(1)", [text("x")])], { id: "p2" }),
    ],
  });
  const { html, warnings } = renderDocumentToHtml({ document: doc, registry });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.ok(warnings.some((w) => w.code === "unsafe-url"));
});

test("preserves unknown blocks as inert fallback", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [customBlock("consumer.acme.card", 2, { id: "u", props: { sku: "A1" } })],
  });
  const { html, warnings } = renderDocumentToHtml({ document: doc, registry });
  assert.match(html, /disnote-unknown-block/);
  assert.match(html, /data-type="consumer.acme.card"/);
  assert.ok(warnings.some((w) => w.code === "unknown-block"));
});

test("callout renders with intent", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [callout([text("note")], "warning")],
  });
  const { html } = renderDocumentToHtml({ document: doc, registry });
  assert.match(html, /data-intent="warning"/);
});

test("custom HTML renderers extend the document without changing core", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [customBlock("consumer.acme.card", 1, { id: "u", content: [text("Card")] })],
  });
  const { html, warnings } = renderDocumentToHtml({
    document: doc,
    registry,
    policy: {
      blockRenderers: {
        "consumer.acme.card": ({ block, renderInline, escape }) =>
          `<article data-card="${escape(block.id)}">${renderInline(block.content)}</article>`,
      },
    },
  });
  assert.equal(html, '<article data-card="u">Card</article>');
  assert.equal(warnings.length, 0);
});
