import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocument, diagram, validateDocument, DIAGRAM_SAMPLES, articleRegistry } from "../../src/core/index.js";
import { renderDocumentToHtml } from "../../src/renderer-html/index.js";
import { createBlockNoteAdapter } from "../../src/editor/adapter/adapter.js";
import { importMarkdown } from "../../src/import-export/markdown/import.js";
import { exportMarkdownLossy } from "../../src/import-export/markdown/export.js";

test("diagram schema validates formats and bounds while retaining exact source", () => {
  for (const format of ["mermaid", "drawio"] as const) {
    const document = createDocument({ blocks: [diagram(DIAGRAM_SAMPLES[format], format)] });
    assert.equal(validateDocument(document, { registry: articleRegistry }).ok, true);
    const adapter = createBlockNoteAdapter();
    assert.equal(adapter.validateRoundTrip(document).ok, true);
    assert.deepEqual(adapter.fromEditor(adapter.toEditor(document)).blocks[0]?.props, document.blocks[0]?.props);
    assert.equal(importMarkdown(exportMarkdownLossy(document).output).document.blocks[0]?.props["code"], DIAGRAM_SAMPLES[format]);
    assert.equal(validateDocument(createDocument({ blocks: [{ ...document.blocks[0]!, props: { format: "unsupported", code: "x" } }] }), { registry: articleRegistry }).ok, false);
    assert.equal(validateDocument(createDocument({ blocks: [diagram("x".repeat(200001), format)] }), { registry: articleRegistry }).ok, false);
  }
});

test("diagram static HTML escapes code and never embeds executable markup", () => {
  const document = createDocument({ blocks: [diagram('<script>alert(1)</script>', "drawio")] });
  const result = renderDocumentToHtml({ document, registry: articleRegistry });
  assert.match(result.html, /&lt;script&gt;/);
  assert.doesNotMatch(result.html, /<script>/);
});
