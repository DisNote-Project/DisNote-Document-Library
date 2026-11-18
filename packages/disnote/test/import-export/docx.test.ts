import test from "node:test";
import assert from "node:assert/strict";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

import {
  bulletListItem,
  callout,
  canonicalJson,
  checklistItem,
  codeBlock,
  createDocument,
  customBlock,
  heading,
  numberedListItem,
  paragraph,
  link,
  quote,
  text,
} from "../../src/core/index.js";
import { DOCX_PATHS, convertDocxToMarkdown, convertMarkdownToDocx, exportDocx, importDocx } from "../../src/import-export/index.js";

const NOW = "2026-11-15T00:00:00.000Z";

test("DOCX exact round-trip restores the canonical DisNote document", () => {
  const source = createDocument({
    id: "document-docx-roundtrip",
    now: NOW,
    metadata: { title: "DisNote DOCX – Tiếng Việt" },
    blocks: [
      heading(1, [text("Architecture")]),
      paragraph([text("Bold", [{ type: "bold" }]), text(" and Việt Nam", [{ type: "italic" }]), text(" "), link("https://disnote.app/docs", [text("Docs")])]),
      bulletListItem([text("Bullet")]),
      numberedListItem([text("Number")]),
      checklistItem([text("Done")], true),
      quote([text("Quoted")]),
      codeBlock("const value = 1;", "ts"),
      callout([text("Keep this")], "warning"),
      customBlock("table", 1, { props: { rows: [{ cells: [[{ type: "text", text: "A" }]] }] } }),
      customBlock("product.sprint", 3, { props: { sprintId: "s1", capacity: 8 } }),
    ],
  });
  const exported = exportDocx(source);
  assert.ok(exported.bytes.byteLength > 1_000);
  assert.ok(exported.diagnostics.some((item) => item.blockId === source.blocks.at(-1)?.id));
  const parts = unzipSync(exported.bytes);
  const relationships = strFromU8(parts[DOCX_PATHS.DOCUMENT_RELS]!);
  const wordXml = strFromU8(parts[DOCX_PATHS.DOCUMENT]!);
  assert.match(relationships, /relationships\/customXml/u);
  assert.match(relationships, /Target="\.\.\/customXml\/disnote-document\.xml"/u);
  assert.doesNotMatch(wordXml, /w:bookmark(?:Start|End)/u);
  assert.match(wordXml, /<w:tc><w:tcPr\/>/u);
  const imported = importDocx(exported.bytes);
  assert.equal(imported.source, "embedded-canonical");
  assert.equal(canonicalJson(imported.document), canonicalJson(source));
  assert.ok(imported.diagnostics.some((item) => item.code === "embedded-snapshot-used"));
});

test("edited DOCX rejects stale canonical data and parses WordprocessingML", () => {
  const source = createDocument({ now: NOW, blocks: [heading(2, [text("Before")]), paragraph([text("Body")])] });
  const files = unzipSync(exportDocx(source).bytes);
  const documentXml = strFromU8(files[DOCX_PATHS.DOCUMENT]!).replace("Before", "After");
  files[DOCX_PATHS.DOCUMENT] = strToU8(documentXml);
  const imported = importDocx(zipSync(files), { now: NOW });
  assert.equal(imported.source, "wordprocessingml");
  assert.equal(imported.document.blocks[0]?.type, "heading");
  assert.equal(imported.document.blocks[0]?.content?.[0]?.type, "text");
  assert.equal(imported.document.blocks[0]?.content?.[0]?.type === "text" ? imported.document.blocks[0].content[0].text : "", "After");
  assert.ok(imported.diagnostics.some((item) => item.code === "embedded-snapshot-stale"));
});

test("external WordprocessingML imports headings, marks, lists, checklist and table", () => {
  const documentXml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Title</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:i/></w:rPr><w:t>Strong</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Bullet</w:t></w:r></w:p>
    <w:p><w:r><w:t>☐ Check</w:t></w:r></w:p>
    <w:tbl><w:tr><w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    <w:sectPr/></w:body></w:document>`;
  const archive = zipSync({
    "[Content_Types].xml": strToU8("<Types/>"),
    [DOCX_PATHS.DOCUMENT]: strToU8(documentXml),
  });
  const imported = importDocx(archive, { now: NOW });
  assert.deepEqual(imported.document.blocks.map((block) => block.type), ["heading", "paragraph", "bulletListItem", "checklistItem", "table"]);
  const marks = imported.document.blocks[1]?.content?.[0];
  assert.equal(marks?.type === "text" ? marks.marks?.length : 0, 2);
  assert.equal(imported.document.blocks[3]?.props["checked"], false);
});

test("DOCX import rejects malformed and traversal-only archives", () => {
  assert.throws(() => importDocx(new Uint8Array()), /docx-limit-exceeded/u);
  assert.throws(() => importDocx(zipSync({ "../word/document.xml": strToU8("<w:document/>") })), /invalid-docx-archive/u);
});

test("Markdown and DOCX convenience pipeline preserves supported structure", () => {
  const markdown = "# Plan\n\n| Name | Done |\n| --- | --- |\n| Import | yes |\n\n> [!warning] Review\n";
  const docx = convertMarkdownToDocx(markdown, { now: NOW });
  assert.equal(docx.warnings.length, 0);
  const restored = convertDocxToMarkdown(docx.bytes, { now: NOW });
  assert.match(restored.markdown, /^# Plan/mu);
  assert.match(restored.markdown, /\| Name \| Done \|/u);
  assert.match(restored.markdown, /> \[!warning\] Review/u);
});

test("custom DOCX codecs recover extension blocks after a Word edit", () => {
  const source = createDocument({ now: NOW, blocks: [customBlock("product.sprint", 1, { props: { name: "Sprint 9" } })] });
  const codec = {
    blockType: "product.sprint",
    toWordText: (block: typeof source.blocks[number]) => String(block.props["name"]),
    fromWordText: (value: string) => customBlock("product.sprint", 1, { props: { name: value } }),
  };
  const files = unzipSync(exportDocx(source, { extensions: [codec] }).bytes);
  files[DOCX_PATHS.DOCUMENT] = strToU8(strFromU8(files[DOCX_PATHS.DOCUMENT]!).replace("Sprint 9", "Sprint 10"));
  const imported = importDocx(zipSync(files), { now: NOW, extensions: [codec] });
  assert.equal(imported.source, "wordprocessingml");
  assert.equal(imported.document.blocks[0]?.type, "product.sprint");
  assert.equal(imported.document.blocks[0]?.props["name"], "Sprint 10");
});
