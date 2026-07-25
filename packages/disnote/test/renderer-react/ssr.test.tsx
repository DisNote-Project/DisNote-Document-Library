import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createDocument,
  heading,
  paragraph,
  bulletListItem,
  customBlock,
  image,
  reference,
  text,
  createDefaultRegistry,
} from "../../src/core/index.js";
import { DocumentRenderer } from "../../src/renderer-react/index.js";

const registry = createDefaultRegistry();

test("DocumentRenderer produces server HTML without an editor", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [
      heading(1, [text("Heading")], { id: "h" }),
      paragraph([text("bold", [{ type: "bold" }])], { id: "p" }),
      bulletListItem([text("item")]),
    ],
  });
  const html = renderToStaticMarkup(
    <DocumentRenderer document={doc} registry={registry} mode="published" />,
  );
  assert.match(html, /<h1>Heading<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<ul><li>item<\/li><\/ul>/);
});

test("DocumentRenderer preserves unknown blocks", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [customBlock("consumer.acme.card", 1, { id: "u" })],
  });
  const html = renderToStaticMarkup(<DocumentRenderer document={doc} registry={registry} />);
  assert.match(html, /disnote-unknown-block/);
  assert.match(html, /consumer.acme.card/);
});

test("DocumentRenderer delegates consumer blocks to a registered renderer", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [customBlock("consumer.acme.card", 1, { id: "u", content: [text("Card")] })],
  });
  const html = renderToStaticMarkup(
    <DocumentRenderer
      document={doc}
      registry={registry}
      blockRenderers={{
        "consumer.acme.card": ({ block, renderInline }) => (
          <article data-card={block.id}>{renderInline(block.content)}</article>
        ),
      }}
    />,
  );
  assert.match(html, /<article data-card="u">Card<\/article>/);
  assert.doesNotMatch(html, /disnote-unknown-block/);
});

test("DocumentRenderer drops unsafe resolver URLs", () => {
  const doc = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [
      paragraph([reference("document", "d1", "Unsafe")], { id: "p" }),
      image("asset", "Unsafe image", { id: "image" }),
    ],
  });
  const html = renderToStaticMarkup(
    <DocumentRenderer
      document={doc}
      registry={registry}
      referenceResolver={() => ({ status: "resolved", href: "javascript:alert(1)", label: "Unsafe" })}
      assetResolver={() => "javascript:alert(1)"}
    />,
  );
  assert.doesNotMatch(html, /href="javascript:/);
  assert.doesNotMatch(html, /src="javascript:/);
});
