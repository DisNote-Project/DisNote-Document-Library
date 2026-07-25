import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDocument,
  paragraph,
  image,
  text,
  link,
  createDefaultRegistry,
  validateDocument,
} from "../../src/core/index.js";
import { renderDocumentToHtml } from "../../src/renderer-html/index.js";

const registry = createDefaultRegistry();
const NOW = "2026-01-01T00:00:00.000Z";

// XSS fixture corpus (guideline section 28.5).
const UNSAFE_HREFS = [
  "javascript:alert(1)",
  "JavaScript:alert(1)",
  "  javascript:alert(1)",
  "vbscript:msgbox(1)",
  "data:text/html,<script>alert(1)</script>",
  "file:///etc/passwd",
];

test("all unsafe URL schemes are dropped by validation and rendering", () => {
  for (const href of UNSAFE_HREFS) {
    const doc = createDocument({ now: NOW, blocks: [paragraph([link(href, [text("x")])], { id: "p" })] });
    const validation = validateDocument(doc);
    assert.equal(validation.ok, false, `validation should reject ${href}`);
    const { html } = renderDocumentToHtml({ document: doc, registry });
    assert.doesNotMatch(html, /href="(javascript|vbscript|file|data):/i, `render should drop ${href}`);
  }
});

test("script tags and angle brackets in text are escaped, never emitted raw", () => {
  const payloads = ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "</p><svg onload=alert(1)>"];
  for (const p of payloads) {
    const doc = createDocument({ now: NOW, blocks: [paragraph([text(p)], { id: "p" })] });
    const { html } = renderDocumentToHtml({ document: doc, registry });
    // No raw tags survive — everything dangerous is escaped into text.
    assert.doesNotMatch(html, /<(script|img|svg)\b/i);
    assert.match(html, /&lt;/);
  }
});

test("image alt text is escaped", () => {
  const doc = createDocument({ now: NOW, blocks: [image("a1", '"><script>alert(1)</script>')] });
  const { html } = renderDocumentToHtml({ document: doc, registry });
  assert.doesNotMatch(html, /<script>/i);
});
