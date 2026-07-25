import type { DisNoteDocument } from "@disnote/document-core";
import {
  makeAllBlocksDocument,
  makeAllMarksDocument,
  makeEmptyDocument,
  makeNestedListDocument,
  makeParagraphDocument,
  makeVietnameseDocument,
} from "../factories/index.js";

/** The canonical fixture corpus used across the test suites. */
export const fixtures: Record<string, () => DisNoteDocument> = {
  empty: makeEmptyDocument,
  paragraphs: makeParagraphDocument,
  allMarks: makeAllMarksDocument,
  nestedLists: makeNestedListDocument,
  allBlocks: makeAllBlocksDocument,
  vietnamese: makeVietnameseDocument,
};

export function allFixtures(): DisNoteDocument[] {
  return Object.values(fixtures).map((make) => make());
}
