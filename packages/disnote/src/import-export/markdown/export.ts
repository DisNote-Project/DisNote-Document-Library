import { LIBRARY_MESSAGES } from "../../core/messages.js";
import type {
  DisNoteBlock,
  DisNoteDocument,
  DisNoteInline,
  TextInline,
} from "../../core/index.js";
import { WarningSink, type LossyExportResult } from "../warnings.js";

function inlineToMd(
  content: DisNoteInline[] | undefined,
  w: WarningSink,
  blockId: string
): string {
  if (!content) return "";
  return content
    .map((node) => {
      switch (node.type) {
        case "text":
          return textToMd(node, w, blockId);
        case "link":
          return `[${node.content
            .map((t) => textToMd(t, w, blockId))
            .join("")}](${node.href})`;
        case "mention":
          w.add(
            "lossy-inline",
            LIBRARY_MESSAGES.mentionExportedAsText(node.label),
            blockId
          );
          return `@${node.label}`;
        case "reference":
          w.add(
            "lossy-inline",
            LIBRARY_MESSAGES.referenceExportedAsText(node.label),
            blockId
          );
          return node.label;
      }
    })
    .join("");
}

function textToMd(node: TextInline, w: WarningSink, blockId: string): string {
  let out = node.text;
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        out = `**${out}**`;
        break;
      case "italic":
        out = `*${out}*`;
        break;
      case "code":
        out = `\`${out}\``;
        break;
      case "strike":
        out = `~~${out}~~`;
        break;
      case "underline":
        w.add("lossy-mark", LIBRARY_MESSAGES.UNDERLINE_DROPPED, blockId);
        break;
      case "textColor":
      case "backgroundColor":
        w.add("lossy-mark", LIBRARY_MESSAGES.COLOR_MARK_DROPPED, blockId);
        break;
    }
  }
  return out;
}

function blockToMd(
  block: DisNoteBlock,
  w: WarningSink,
  depth: number
): string[] {
  const indent = "  ".repeat(depth);
  const inline = inlineToMd(block.content, w, block.id);
  const childLines = (block.children ?? []).flatMap((c) =>
    blockToMd(c, w, depth + 1)
  );

  switch (block.type) {
    case "heading": {
      const level =
        typeof block.props["level"] === "number"
          ? (block.props["level"] as number)
          : 1;
      return [`${indent}${"#".repeat(level)} ${inline}`, ...childLines];
    }
    case "paragraph":
      return [`${indent}${inline}`, ...childLines];
    case "bulletListItem":
      return [`${indent}- ${inline}`, ...childLines];
    case "numberedListItem":
      return [`${indent}1. ${inline}`, ...childLines];
    case "checklistItem": {
      const checked = block.props["checked"] === true ? "x" : " ";
      return [`${indent}- [${checked}] ${inline}`, ...childLines];
    }
    case "quote":
      return [`${indent}> ${inline}`, ...childLines];
    case "codeBlock": {
      const code =
        typeof block.props["code"] === "string"
          ? (block.props["code"] as string)
          : "";
      const lang =
        typeof block.props["language"] === "string"
          ? (block.props["language"] as string)
          : "";
      return [
        `${indent}\`\`\`${lang}`,
        ...code.split("\n").map((l) => indent + l),
        `${indent}\`\`\``,
      ];
    }
    case "math": {
      const code =
        typeof block.props["code"] === "string"
          ? block.props["code"]
          : "";
      return [
        `${indent}$$`,
        ...code.split("\n").map((line) => `${indent}${line}`),
        `${indent}$$`,
      ];
    }
    case "divider":
      return [`${indent}---`];
    case "callout":
      w.add(
        "lossy-block",
        LIBRARY_MESSAGES.CALLOUT_EXPORTED_AS_QUOTE,
        block.id
      );
      return [
        `${indent}> [!${String(block.props["intent"] ?? "info")}] ${inline}`,
        ...childLines,
      ];
    case "image": {
      const alt =
        typeof block.props["alt"] === "string"
          ? (block.props["alt"] as string)
          : "";
      const assetId =
        typeof block.props["assetId"] === "string"
          ? (block.props["assetId"] as string)
          : "";
      w.add(
        "lossy-block",
        LIBRARY_MESSAGES.IMAGE_EXPORTED_AS_ASSET_REFERENCE,
        block.id
      );
      return [`${indent}![${alt}](${assetId})`];
    }
    default:
      w.add(
        "unknown-block",
        LIBRARY_MESSAGES.unknownBlockOmitted(block.type),
        block.id
      );
      return [];
  }
}

/** Export a document to Markdown. Markdown is lossy; warnings list what changed. */
export function exportMarkdownLossy(
  document: DisNoteDocument
): LossyExportResult {
  const w = new WarningSink();
  const lines: string[] = [];
  for (const block of document.blocks) {
    lines.push(...blockToMd(block, w, 0));
    lines.push("");
  }
  return {
    output:
      lines
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim() + "\n",
    warnings: w.list,
  };
}
