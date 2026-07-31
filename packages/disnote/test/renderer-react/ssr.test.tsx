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
  mathEquation,
  reference,
  text,
  createDefaultRegistry,
} from "../../src/core/index.js";
import { DocumentRenderer } from "../../src/renderer-react/index.js";
import {
  MathEquationEditor,
} from "../../src/editor/react/MathEquationEditor.js";

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
  assert.match(html, /<h1 id="h">Heading<\/h1>/);
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

test("DocumentRenderer drops unsafe bookmark and media URLs", () => {
  const document = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [
      customBlock("bookmark", 1, { id: "bookmark", props: { url: "javascript:alert(1)", title: "Unsafe" } }),
      customBlock("video", 1, { id: "video", props: { url: "javascript:alert(1)" } }),
      customBlock("audio", 1, { id: "audio", props: { url: "javascript:alert(1)" } }),
      customBlock("file", 1, { id: "file", props: { url: "javascript:alert(1)", name: "Unsafe" } }),
    ],
  });
  const html = renderToStaticMarkup(
    <DocumentRenderer document={document} registry={registry} />,
  );
  assert.doesNotMatch(html, /(href|src)="javascript:/i);
});

test("DocumentRenderer respects registry membership and block versions", () => {
  const document = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [customBlock("paragraph", 2, { id: "future", content: [text("Future")] })],
  });
  const html = renderToStaticMarkup(
    <DocumentRenderer document={document} registry={registry} />,
  );
  assert.match(html, /data-reason="unsupported-version"/);
  assert.doesNotMatch(html, /<p>Future<\/p>/);
});

test("math blocks render semantic MathML instead of raw LaTeX delimiters", () => {
  const document = createDocument({
    now: "2026-01-01T00:00:00.000Z",
    blocks: [mathEquation("\\frac{x^2}{y_1}")],
  });
  const html = renderToStaticMarkup(
    <DocumentRenderer document={document} registry={registry} />
  );
  assert.match(html, /<math/);
  assert.match(html, /<mfrac>/);
  assert.doesNotMatch(html, /\$\$/);
});

test("visual equation editor renders its palette without exposing raw LaTeX", () => {
  const html = renderToStaticMarkup(
    <MathEquationEditor
      code="x^2"
      onChange={() => undefined}
    />
  );
  assert.match(html, /Structures/);
  assert.match(html, /aria-label="Fraction"/);
  assert.match(html, /<math/);
  assert.match(html, /<math-field/);
  assert.match(html, /Type directly in the equation/);
  assert.doesNotMatch(html, /<textarea/);
});
