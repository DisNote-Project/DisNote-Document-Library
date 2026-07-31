import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDocument,
  heading,
  paragraph,
  bulletListItem,
  checklistItem,
  codeBlock,
  mathEquation,
  quote,
  divider,
  callout,
  text,
  link,
  extractDocumentPlainText,
  createDefaultRegistry,
} from "../../src/core/index.js";
import {
  exportMarkdownLossy,
  importMarkdown,
  importHtml,
  importClipboard,
} from "../../src/import-export/index.js";

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

test("html import correctly parses nested lists", () => {
  const html = "<ul><li>parent<ul><li>child 1</li><li>child 2</li></ul></li></ul>";
  const { document } = importHtml(html, { now: NOW });

  assert.equal(document.blocks.length, 1);
  const parentBlock = document.blocks[0]!;
  assert.equal(parentBlock.type, "bulletListItem");

  // Verify children
  assert.ok(parentBlock.children);
  assert.equal(parentBlock.children.length, 2);
  assert.equal(parentBlock.children[0]!.type, "bulletListItem");
  assert.equal(parentBlock.children[1]!.type, "bulletListItem");
});

test("html import correctly parses tables", () => {
  const html = "<table><tbody><tr><td>cell A</td><td>cell B</td></tr></tbody></table>";
  const { document } = importHtml(html, { now: NOW });

  assert.equal(document.blocks.length, 1);
  const tableBlock = document.blocks[0]!;
  assert.equal(tableBlock.type, "table");

  const rows = tableBlock.props["rows"] as Array<{ cells: Array<Array<{ text: string }>> }>;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].cells.length, 2);
  assert.equal(rows[0].cells[0][0].text, "cell A");
  assert.equal(rows[0].cells[1][0].text, "cell B");
});

test("clipboard import preserves semantic structure copied from VS Code Markdown Preview", () => {
  const html = [
    "<meta charset='utf-8'>",
    "<!--StartFragment-->",
    '<div class="markdown-body">',
    '<h1 id="disnote-checklist">DisNote checklist</h1>',
    "<p>This is <strong>important</strong> and <a href='https://example.com'>linked</a>.</p>",
    "<h2>Targets</h2>",
    "<ul><li>Desktop</li><li>Mobile<ul><li>iOS</li></ul></li></ul>",
    "<ol><li>Publish</li></ol>",
    "<blockquote><p>Keep the block structure.</p></blockquote>",
    "</div>",
    "<!--EndFragment-->",
  ].join("");

  const { document } = importClipboard({
    html,
    text: [
      "DisNote checklist",
      "This is important and linked.",
      "Targets",
      "Desktop",
      "Mobile",
      "iOS",
      "Publish",
      "Keep the block structure.",
    ].join("\n"),
  }, { now: NOW });

  assert.deepEqual(
    document.blocks.map((block) => block.type),
    ["heading", "paragraph", "heading", "bulletListItem", "bulletListItem", "numberedListItem", "quote"],
  );
  assert.equal(document.blocks[0]!.props["level"], 1);
  assert.equal(document.blocks[2]!.props["level"], 2);
  assert.equal(document.blocks[4]!.children?.[0]?.type, "bulletListItem");
  assert.ok(document.blocks[1]!.content?.some((node) => node.type === "link"));
  assert.ok(
    document.blocks[1]!.content?.some(
      (node) => node.type === "text" && node.marks?.some((mark) => mark.type === "bold"),
    ),
  );
});

test("clipboard import falls back to Markdown or plain text when semantic HTML is absent", () => {
  const markdown = importClipboard({ text: "# Title\n\n- item" }, { now: NOW });
  assert.deepEqual(markdown.document.blocks.map((block) => block.type), ["heading", "bulletListItem"]);

  const plainText = importClipboard({ text: "first line\nsecond line" }, { now: NOW });
  assert.deepEqual(plainText.document.blocks.map((block) => block.type), ["paragraph", "paragraph"]);
});

test("math equations round-trip through Markdown without a lossy warning", () => {
  const source = createDocument({
    now: NOW,
    blocks: [mathEquation("\\frac{x^2}{y_1}")],
  });
  const exported = exportMarkdownLossy(source);
  assert.equal(exported.warnings.length, 0);
  assert.match(exported.output, /\$\$\n\\frac\{x\^2\}\{y_1\}\n\$\$/);

  const imported = importMarkdown(exported.output, { now: NOW });
  assert.equal(imported.document.blocks[0]?.type, "math");
  assert.equal(
    imported.document.blocks[0]?.props["code"],
    "\\frac{x^2}{y_1}"
  );
});

test("math equations round-trip through rendered DisNote HTML", () => {
  const html =
    '<div class="disnote-math" data-latex="x^2 + y_1"><math></math></div>';
  const imported = importHtml(html, { now: NOW });
  assert.equal(imported.document.blocks.length, 1);
  assert.equal(imported.document.blocks[0]?.type, "math");
  assert.equal(imported.document.blocks[0]?.props["code"], "x^2 + y_1");
});
