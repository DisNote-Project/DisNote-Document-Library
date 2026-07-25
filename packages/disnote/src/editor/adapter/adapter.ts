import type { DisNoteBlock, DisNoteDocument, DocumentMetadata } from "../../core/index.js";
import { canonicalJson } from "../../core/index.js";
import type { BnBlock } from "./blocknote-shape.js";
import { blockFromBn, blockToBn } from "./convert.js";

export interface EnvelopeMeta {
  format: "disnote-document";
  schemaVersion: number;
  id: string;
  metadata: DocumentMetadata;
  /** Preserves metadata that native BlockNote schemas do not expose. */
  blockVersions: Record<string, number>;
  blockProps: Record<string, DisNoteBlock["props"]>;
}

/** The editor-side document: BlockNote blocks plus the DisNote envelope. */
export interface BlockNoteEditorDocument {
  blocks: BnBlock[];
  envelope: EnvelopeMeta;
}

export interface RoundTripReport {
  ok: boolean;
  differences: string[];
}

/** Generic contract every editor adapter implements. */
export interface EditorAdapter<EditorDocument> {
  toEditor(document: DisNoteDocument): EditorDocument;
  fromEditor(document: EditorDocument): DisNoteDocument;
  validateRoundTrip(document: DisNoteDocument): RoundTripReport;
}

/** Normalize optional fields so comparisons are about semantics, not shape. */
function normalizeBlocks(blocks: DisNoteBlock[]): DisNoteBlock[] {
  return blocks.map((b) => ({
    id: b.id,
    type: b.type,
    version: b.version,
    props: b.props,
    content: b.content ?? [],
    children: normalizeBlocks(b.children ?? []),
  }));
}

function normalizeDocument(doc: DisNoteDocument): unknown {
  return {
    format: doc.format,
    schemaVersion: doc.schemaVersion,
    id: doc.id,
    blocks: normalizeBlocks(doc.blocks),
  };
}

export function createBlockNoteAdapter(): EditorAdapter<BlockNoteEditorDocument> {
  return {
    toEditor(document) {
      const blockVersions: Record<string, number> = {};
      const blockProps: Record<string, DisNoteBlock["props"]> = {};
      const collectMetadata = (blocks: DisNoteBlock[]): void => {
        for (const block of blocks) {
          blockVersions[block.id] = block.version;
          blockProps[block.id] = block.props;
          collectMetadata(block.children ?? []);
        }
      };
      collectMetadata(document.blocks);

      return {
        blocks: document.blocks.map(blockToBn),
        envelope: {
          format: document.format,
          schemaVersion: document.schemaVersion,
          id: document.id,
          metadata: document.metadata,
          blockVersions,
          blockProps,
        },
      };
    },

    fromEditor(editorDocument) {
      return {
        format: editorDocument.envelope.format,
        schemaVersion: editorDocument.envelope.schemaVersion,
        id: editorDocument.envelope.id,
        metadata: editorDocument.envelope.metadata,
        blocks: editorDocument.blocks.map((block) => blockFromBn(block, editorDocument.envelope)),
      };
    },

    validateRoundTrip(document) {
      const back = this.fromEditor(this.toEditor(document));
      const a = canonicalJson(normalizeDocument(document) as never);
      const b = canonicalJson(normalizeDocument(back) as never);
      if (a === b) return { ok: true, differences: [] };
      return { ok: false, differences: [`Round-trip mismatch.\n  before: ${a}\n  after:  ${b}`] };
    },
  };
}
