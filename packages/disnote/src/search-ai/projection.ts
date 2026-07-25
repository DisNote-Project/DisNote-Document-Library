import type { BlockRegistry, DisNoteBlock, DisNoteDocument, DisNoteInline } from "../core/index.js";
import { extractDocumentPlainText, extractHeadings, visitBlocks } from "../core/index.js";

export interface SearchReference {
  kind: "mention" | "reference";
  targetType: string;
  targetId: string;
  label: string;
}

export interface DocumentSearchProjection {
  documentId: string;
  revision: number;
  title: string;
  plainText: string;
  headings: string[];
  references: SearchReference[];
  assets: string[];
  locale: string;
}

function inlineRefs(content: DisNoteInline[] | undefined, out: SearchReference[]): void {
  for (const node of content ?? []) {
    if (node.type === "mention") out.push({ kind: "mention", targetType: node.entityType, targetId: node.entityId, label: node.label });
    else if (node.type === "reference") out.push({ kind: "reference", targetType: node.targetType, targetId: node.targetId, label: node.label });
    else if (node.type === "link") inlineRefs(node.content, out);
  }
}

/**
 * Build a search projection from the registry — NOT by parsing rendered output.
 * Produced once per revision for indexing and AI context.
 */
export function buildSearchProjection(
  document: DisNoteDocument,
  registry: BlockRegistry,
  revision: number,
): DocumentSearchProjection {
  const references: SearchReference[] = [];
  const assets: string[] = [];
  visitBlocks(document, ({ block }: { block: DisNoteBlock }) => {
    inlineRefs(block.content, references);
    if (block.type === "image" && typeof block.props["assetId"] === "string") {
      assets.push(block.props["assetId"] as string);
    }
  });

  return {
    documentId: document.id,
    revision,
    title: document.metadata.title ?? "",
    plainText: extractDocumentPlainText(document, registry),
    headings: extractHeadings(document).map((h) => h.text),
    references,
    assets,
    locale: document.metadata.locale ?? "en",
  };
}
