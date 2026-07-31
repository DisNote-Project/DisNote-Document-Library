import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyMathPaletteItem,
  isValidMathExpression,
  mathFieldTemplateFor,
  mathPaletteByCategory,
  mathPaletteItems,
  renderMathToMarkup,
} from "../../src/math/index.js";

test("renders fractions, superscripts and subscripts as semantic MathML", () => {
  const result = renderMathToMarkup("\\frac{x^2}{y_1}");
  assert.equal(result.ok, true);
  assert.match(result.markup, /<math/);
  assert.match(result.markup, /<mfrac>/);
  assert.match(result.markup, /<msup>/);
  assert.match(result.markup, /<msub>/);
});

test("accepts directly typed Unicode and Vietnamese labels", () => {
  const unicode = renderMathToMarkup("x² + α ≤ β");
  assert.equal(unicode.ok, true);
  assert.match(unicode.markup, /<msup>/);

  const vietnamese = renderMathToMarkup("\\text{Tốc độ}");
  assert.equal(vietnamese.ok, true);
  assert.match(vietnamese.markup, /Tốc độ/);
});

test("reports malformed expressions without emitting partial markup", () => {
  const result = renderMathToMarkup("\\frac{");
  assert.equal(result.ok, false);
  assert.equal(result.markup, "");
  assert.equal(isValidMathExpression("\\sqrt{x}"), true);
  assert.equal(isValidMathExpression("\\sqrt{"), false);
});

test("trusted HTML commands and executable URLs are not emitted", () => {
  const href = renderMathToMarkup(
    "\\href{javascript:alert(1)}{unsafe}"
  );
  assert.doesNotMatch(href.markup, /\shref=/i);
  assert.doesNotMatch(href.markup, /<script/i);

  const html = renderMathToMarkup("\\htmlClass{evil}{x}");
  assert.doesNotMatch(html.markup, /\sclass="evil"/i);
});

test("equation palette exposes every Word-like category", () => {
  assert.ok(mathPaletteByCategory.structures.length >= 10);
  assert.ok(mathPaletteByCategory.operators.length >= 10);
  assert.ok(mathPaletteByCategory.relations.length >= 10);
  assert.ok(mathPaletteByCategory.greek.length >= 10);
  assert.equal(
    mathPaletteItems.length,
    Object.values(mathPaletteByCategory).flat().length
  );
});

test("palette items insert at the caret and wrap selected expressions", () => {
  const superscript = mathPaletteItems.find(
    (item) => item.id === "superscript"
  )!;
  const fraction = mathPaletteItems.find((item) => item.id === "fraction")!;

  const inserted = applyMathPaletteItem("x", 1, 1, superscript);
  assert.equal(inserted.value, "x^{}");
  assert.equal(inserted.selectionStart, 3);

  const wrapped = applyMathPaletteItem("x+1", 0, 3, fraction);
  assert.equal(wrapped.value, "\\frac{x+1}{}");
  assert.equal(wrapped.selectionStart, "\\frac{x+1}{".length);
});

test("every palette item has a visual math-field insertion template", () => {
  for (const item of mathPaletteItems) {
    const template = mathFieldTemplateFor(item);
    assert.ok(template.insert.length > 0, `${item.id} has an insertion`);
    assert.ok(template.preview.length > 0, `${item.id} has a preview`);
  }

  const fraction = mathPaletteItems.find((item) => item.id === "fraction")!;
  const matrix = mathPaletteItems.find((item) => item.id === "matrix-2")!;
  assert.equal(mathFieldTemplateFor(fraction).insert, "\\frac{#0}{#?}");
  assert.match(mathFieldTemplateFor(matrix).insert, /#\?/);
});
