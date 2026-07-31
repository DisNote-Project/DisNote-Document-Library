import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDocument,
  heading,
  paragraph,
  bulletListItem,
  numberedListItem,
  checklistItem,
  quote,
  codeBlock,
  mathEquation,
  image,
  divider,
  callout,
  customBlock,
  text,
  link,
  mention,
  reference,
} from "../../src/core/index.js";
import { createBlockNoteAdapter } from "../../src/editor/index.js";
import { disNoteBlockNoteSchema } from "../../src/editor/react/schema.js";

const adapter = createBlockNoteAdapter();

function richDocument() {
  return createDocument({
    id: "doc_rt",
    now: "2026-01-01T00:00:00.000Z",
    blocks: [
      heading(1, [text("Title")], { id: "h1" }),
      heading(2, [text("Sub")], { id: "h2" }),
      paragraph(
        [
          text("plain "),
          text("bold", [{ type: "bold" }]),
          text(" "),
          text("multi", [{ type: "italic" }, { type: "code" }]),
          text(" "),
          text("colored", [{ type: "textColor", value: "#0d9488" }]),
          link("https://disnote.dev", [text("link")]),
          mention("user", "u_1", "Mink"),
          reference("task", "t_1", "Ship V1"),
        ],
        { id: "p1" },
      ),
      bulletListItem([text("b1")], [bulletListItem([text("nested")])]),
      numberedListItem([text("n1")]),
      checklistItem([text("todo")], true),
      quote([text("wisdom")]),
      codeBlock("const x = 1;\nconsole.log(x);", "ts"),
      mathEquation("\\frac{x^2}{y_1}"),
      image("asset_1", "alt text"),
      divider(),
      callout([text("watch out")], "warning"),
      customBlock("consumer.acme.card", 3, { id: "custom", props: { sku: "A-1" }, content: [text("card")] }),
    ],
  });
}

test("rich document survives a full round-trip", () => {
  const report = adapter.validateRoundTrip(richDocument());
  assert.equal(report.ok, true, report.differences.join("\n"));
});

test("fromEditor(toEditor(x)) deep-equals x for supported blocks", () => {
  const doc = richDocument();
  const back = adapter.fromEditor(adapter.toEditor(doc));
  assert.deepEqual(back, doc);
});

test("preserves block ids and custom block version", () => {
  const doc = richDocument();
  const back = adapter.fromEditor(adapter.toEditor(doc));
  const custom = back.blocks.find((b) => b.type === "consumer.acme.card");
  assert.equal(custom?.id, "custom");
  assert.equal(custom?.version, 3);
});

test("no vendor prop leaks into the DisNote document", () => {
  const doc = richDocument();
  const back = adapter.fromEditor(adapter.toEditor(doc));
  for (const block of back.blocks) {
    assert.equal(Object.prototype.hasOwnProperty.call(block.props, "__disnoteVersion"), false);
  }
});

test("empty document round-trips", () => {
  const doc = createDocument({ id: "doc_empty", now: "2026-01-01T00:00:00.000Z" });
  const report = adapter.validateRoundTrip(doc);
  assert.equal(report.ok, true);
});

test("adapter output is accepted by the configured BlockNote schema", () => {
  const editorDocument = adapter.toEditor(richDocument());
  const blockTypes = new Set(Object.keys(disNoteBlockNoteSchema.blockSchema));
  const inlineTypes = new Set(Object.keys(disNoteBlockNoteSchema.inlineContentSchema));

  const visit = (blocks: typeof editorDocument.blocks): void => {
    for (const block of blocks) {
      assert.equal(blockTypes.has(block.type), true, `missing BlockNote block spec for ${block.type}`);
      for (const inline of block.content) {
        assert.equal(inlineTypes.has(inline.type), true, `missing BlockNote inline spec for ${inline.type}`);
      }
      visit(block.children);
    }
  };
  visit(editorDocument.blocks);
});

test("unknown custom inline content is rejected instead of becoming a reference", () => {
  const editorDocument = adapter.toEditor(richDocument());
  editorDocument.blocks[0]!.content.push({
    type: "consumer.unknown",
    props: { value: "x" },
  });
  assert.throws(() => adapter.fromEditor(editorDocument), /Unsupported BlockNote inline/);
});
