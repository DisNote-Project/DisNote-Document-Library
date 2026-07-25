import type { DisNoteDocument } from "@disnote/document-core";
import {
  createDocument,
  heading,
  paragraph,
  bulletListItem,
  numberedListItem,
  checklistItem,
  quote,
  codeBlock,
  image,
  divider,
  callout,
  text,
  link,
} from "@disnote/document-core";

const NOW = "2026-01-01T00:00:00.000Z";

export function makeEmptyDocument(): DisNoteDocument {
  return createDocument({ id: "fx_empty", now: NOW });
}

export function makeParagraphDocument(): DisNoteDocument {
  return createDocument({
    id: "fx_paragraphs",
    now: NOW,
    blocks: [paragraph([text("First.")], { id: "p1" }), paragraph([text("Second.")], { id: "p2" })],
  });
}

export function makeAllMarksDocument(): DisNoteDocument {
  return createDocument({
    id: "fx_marks",
    now: NOW,
    blocks: [
      paragraph(
        [
          text("bold", [{ type: "bold" }]),
          text("italic", [{ type: "italic" }]),
          text("underline", [{ type: "underline" }]),
          text("strike", [{ type: "strike" }]),
          text("code", [{ type: "code" }]),
          text("color", [{ type: "textColor", value: "#0d9488" }]),
          link("https://disnote.dev", [text("link")]),
        ],
        { id: "p1" },
      ),
    ],
  });
}

export function makeNestedListDocument(): DisNoteDocument {
  return createDocument({
    id: "fx_lists",
    now: NOW,
    blocks: [
      bulletListItem([text("one")], [bulletListItem([text("one-a")])]),
      bulletListItem([text("two")]),
      numberedListItem([text("first")]),
      checklistItem([text("done")], true),
    ],
  });
}

export function makeAllBlocksDocument(): DisNoteDocument {
  return createDocument({
    id: "fx_all_blocks",
    now: NOW,
    blocks: [
      heading(1, [text("H1")], { id: "h1" }),
      paragraph([text("body")], { id: "p" }),
      quote([text("quote")]),
      codeBlock("const x = 1;", "ts"),
      image("asset_1", "alt"),
      divider(),
      callout([text("note")], "info"),
    ],
  });
}

export function makeVietnameseDocument(): DisNoteDocument {
  return createDocument({
    id: "fx_vi",
    now: NOW,
    metadata: { createdAt: NOW, updatedAt: NOW, locale: "vi" },
    blocks: [paragraph([text("Xin chào — dấu tiếng Việt, gõ IME, café, naïve.")], { id: "vi" })],
  });
}
