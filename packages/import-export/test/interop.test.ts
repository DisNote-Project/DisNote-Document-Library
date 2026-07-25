import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDocument,
  heading,
  paragraph,
  bulletListItem,
  checklistItem,
  codeBlock,
  quote,
  divider,
  callout,
  text,
  link,
  extractDocumentPlainText,
  createDefaultRegistry,
} from "../../document-core/src/index.js";
import { exportMarkdownLossy, importMarkdown, importHtml } from "../src/index.js";

const registry = createDefaultRegistry();
const NOW = "2026-01-01T00:00:00.000Z";

test("markdown export covers core blocks and flags lossy items", () => {
  const doc = createDocument({
    now: NOW,
    blocks: [
      heading(1, [text("Title")]),
      paragraph([text("hello "), text("bold", [{ type: "bold" }]), text(" and "), link("https://x.dev", [text("link")])]),
      bulletListItem([text("a")]),
      checklistItem([text("done")], true),
      quote([text("q")]),
      codeBlock("x=1", "py"),
      divider(),
      callout([text("note")], "warning"),
    ],
  });
  const { output, warnings } = exportMarkdownLossy(doc);
  assert.match(output, /^# Title/m);
  assert.match(output, /\*\*bold\*\*/);
  assert.match(output, /\[link\]\(https:\/\/x\.dev\)/);
  assert.match(output, /- \[x\] done/);
  assert.match(output, /```py/);
  assert.ok(warnings.some((w) => w.code === "lossy-block")); // callout
});

test("markdown import parses headings, lists, code and inline marks", () => {
  const md = "# Hello\n\nsome **bold** and *italic* and `code`\n\n- one\n- two\n\n```ts\nconst x = 1;\n```\n";
  const { document } = importMarkdown(md, { now: NOW });
  const types = document.blocks.map((b) => b.type);
  assert.deepEqual(types, ["heading", "paragraph", "bulletListItem", "bulletListItem", "codeBlock"]);
  assert.equal(extractDocumentPlainText(document, registry).split("\n")[0], "Hello");
});

test("markdown round-trips a supported subset back to equivalent text", () => {
  const doc = createDocument({
    now: NOW,
    blocks: [heading(2, [text("H")]), paragraph([text("p")]), bulletListItem([text("x")])],
  });
  const { output } = exportMarkdownLossy(doc);
  const { document } = importMarkdown(output, { now: NOW });
  assert.deepEqual(document.blocks.map((b) => b.type), ["heading", "paragraph", "bulletListItem"]);
});

test("markdown import drops unsafe links", () => {
  const { warnings } = importMarkdown("[x](javascript:alert(1))", { now: NOW });
  assert.ok(warnings.some((w) => w.code === "unsafe-url"));
});

test("html import maps supported tags and sanitizes", () => {
  const html =
    '<h2>Title</h2><p>hello <strong>bold</strong> <a href="https://x.dev">link</a> <a href="javascript:alert(1)">bad</a></p><ul><li>one</li><li>two</li></ul>';
  const { document, warnings } = importHtml(html, { now: NOW });
  assert.deepEqual(document.blocks.map((b) => b.type), ["heading", "paragraph", "bulletListItem", "bulletListItem"]);
  assert.ok(warnings.some((w) => w.code === "unsafe-url"));
  const p = document.blocks[1]!;
  assert.ok(p.content?.some((n) => n.type === "link" && n.href === "https://x.dev"));
});
