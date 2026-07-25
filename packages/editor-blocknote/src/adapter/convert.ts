import type {
  DisNoteBlock,
  DisNoteInline,
  TextInline,
  TextMark,
} from "@disnote/document-core";
import type { EnvelopeMeta } from "./adapter.js";
import type { BnBlock, BnInlineContent, BnStyledText, BnStyles } from "./blocknote-shape.js";

/* ------------------------------- type names ------------------------------- */

const TO_BN_TYPE: Record<string, string> = { checklistItem: "checkListItem" };
const FROM_BN_TYPE: Record<string, string> = { checkListItem: "checklistItem" };

const VOID_TYPES = new Set(["image", "divider", "codeBlock"]);
const NATIVE_BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "checklistItem",
]);
const GENERIC_BLOCK_TYPE = "disnoteBlock";

/* --------------------------------- inline --------------------------------- */

function marksToStyles(marks: TextMark[] | undefined): BnStyles {
  const styles: BnStyles = {};
  for (const mark of marks ?? []) {
    switch (mark.type) {
      case "bold":
        styles.bold = true;
        break;
      case "italic":
        styles.italic = true;
        break;
      case "underline":
        styles.underline = true;
        break;
      case "strike":
        styles.strikethrough = true;
        break;
      case "code":
        styles.code = true;
        break;
      case "textColor":
        styles.textColor = mark.value;
        break;
      case "backgroundColor":
        styles.backgroundColor = mark.value;
        break;
    }
  }
  return styles;
}

/** Canonical mark order so conversions are deterministic. */
function stylesToMarks(styles: BnStyles | undefined): TextMark[] {
  const marks: TextMark[] = [];
  if (!styles) return marks;
  if (styles.bold) marks.push({ type: "bold" });
  if (styles.italic) marks.push({ type: "italic" });
  if (styles.underline) marks.push({ type: "underline" });
  if (styles.strikethrough) marks.push({ type: "strike" });
  if (styles.code) marks.push({ type: "code" });
  if (styles.textColor) marks.push({ type: "textColor", value: styles.textColor });
  if (styles.backgroundColor) marks.push({ type: "backgroundColor", value: styles.backgroundColor });
  return marks;
}

function textToBn(node: TextInline): BnStyledText {
  return { type: "text", text: node.text, styles: marksToStyles(node.marks) };
}

function bnToText(node: BnStyledText): TextInline {
  const marks = stylesToMarks(node.styles);
  return marks.length > 0 ? { type: "text", text: node.text, marks } : { type: "text", text: node.text };
}

export function inlineToBn(content: DisNoteInline[] | undefined): BnInlineContent[] {
  if (!content) return [];
  return content.map((node): BnInlineContent => {
    switch (node.type) {
      case "text":
        return textToBn(node);
      case "link":
        return { type: "link", href: node.href, content: node.content.map(textToBn) };
      case "mention":
        return { type: "mention", props: { entityType: node.entityType, entityId: node.entityId, label: node.label } };
      case "reference":
        return { type: "reference", props: { targetType: node.targetType, targetId: node.targetId, label: node.label } };
    }
  });
}

export function inlineFromBn(content: BnInlineContent[] | undefined): DisNoteInline[] {
  if (!content) return [];
  return content.map((node): DisNoteInline => {
    if (node.type === "text") return bnToText(node as BnStyledText);
    if (node.type === "link") {
      const link = node as { href: string; content: BnStyledText[] };
      return { type: "link", href: link.href, content: link.content.map(bnToText) };
    }
    if (node.type === "mention") {
      const p = (node as { props: Record<string, unknown> }).props;
      return {
        type: "mention",
        entityType: (p["entityType"] as "user" | "channel") ?? "user",
        entityId: String(p["entityId"] ?? ""),
        label: String(p["label"] ?? ""),
      };
    }
    if (node.type === "reference") {
      const p = (node as { props: Record<string, unknown> }).props;
      return {
        type: "reference",
        targetType: (p["targetType"] as "task" | "document" | "message" | "file") ?? "document",
        targetId: String(p["targetId"] ?? ""),
        label: String(p["label"] ?? ""),
      };
    }
    throw new Error(`Unsupported BlockNote inline content type "${node.type}".`);
  });
}

/* --------------------------------- blocks --------------------------------- */

export function blockToBn(block: DisNoteBlock): BnBlock {
  const type = TO_BN_TYPE[block.type] ?? block.type;
  const children = (block.children ?? []).map(blockToBn);

  if (!NATIVE_BLOCK_TYPES.has(block.type)) {
    const code = typeof block.props["code"] === "string" ? (block.props["code"] as string) : "";
    const content = block.type === "codeBlock"
      ? (code ? [{ type: "text" as const, text: code, styles: {} }] : [])
      : inlineToBn(block.content);
    return {
      id: block.id,
      type: GENERIC_BLOCK_TYPE,
      props: {
        originalType: block.type,
        originalVersion: block.version,
        propsJson: JSON.stringify(block.props),
      },
      content,
      children,
    };
  }

  const props: Record<string, unknown> = {};
  if (block.type === "heading") props["level"] = block.props["level"] ?? 1;
  if (block.type === "checklistItem") props["checked"] = block.props["checked"] === true;
  return {
    id: block.id,
    type,
    props,
    content: inlineToBn(block.content),
    children,
  };
}

function readVersion(value: unknown): number {
  const v = value;
  return typeof v === "number" && Number.isInteger(v) && v > 0 ? v : 1;
}

function readPropsJson(value: unknown): DisNoteBlock["props"] {
  if (typeof value !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as DisNoteBlock["props"]
      : {};
  } catch {
    return {};
  }
}

export function blockFromBn(bn: BnBlock, envelope?: EnvelopeMeta): DisNoteBlock {
  if (bn.type === GENERIC_BLOCK_TYPE) {
    const type = typeof bn.props["originalType"] === "string" ? bn.props["originalType"] : "paragraph";
    const props = readPropsJson(bn.props["propsJson"]);
    if (type === "codeBlock") {
      props["code"] = bn.content
        .filter((node): node is BnStyledText => node.type === "text")
        .map((node) => node.text)
        .join("");
    }
    const block: DisNoteBlock = {
      id: bn.id,
      type,
      version: readVersion(bn.props["originalVersion"]),
      props,
    };
    if (!VOID_TYPES.has(type)) block.content = inlineFromBn(bn.content);
    const children = (bn.children ?? []).map((child) => blockFromBn(child, envelope));
    if (children.length > 0) block.children = children;
    return block;
  }

  const type = FROM_BN_TYPE[bn.type] ?? bn.type;
  const children = (bn.children ?? []).map((child) => blockFromBn(child, envelope));
  const props = { ...(envelope?.blockProps[bn.id] ?? {}) };
  if (type === "heading") props["level"] = bn.props["level"] === 2 ? 2 : bn.props["level"] === 3 ? 3 : 1;
  if (type === "checklistItem") props["checked"] = bn.props["checked"] === true;

  const block: DisNoteBlock = {
    id: bn.id,
    type,
    version: readVersion(envelope?.blockVersions[bn.id]),
    props,
  };
  if (!VOID_TYPES.has(type)) block.content = inlineFromBn(bn.content);
  if (children.length > 0) block.children = children;
  return block;
}
