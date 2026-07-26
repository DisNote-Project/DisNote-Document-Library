import type {
  DisNoteBlock,
  DisNoteInline,
  TextInline,
  TextMark,
} from "../../core/index.js";
import type { EnvelopeMeta } from "./adapter.js";
import type { BnBlock, BnInlineContent, BnStyledText, BnStyles } from "./blocknote-shape.js";

/* ------------------------------- type names ------------------------------- */

/** DisNote type -> BlockNote type (only where the names differ). */
const TO_BN_TYPE: Record<string, string> = {
  checklistItem: "checkListItem",
  toggle: "toggleListItem",
};
/** BlockNote type -> DisNote type (reverse of the above). */
const FROM_BN_TYPE: Record<string, string> = {
  checkListItem: "checklistItem",
  toggleListItem: "toggle",
};

/**
 * DisNote block types mapped DIRECTLY onto a BlockNote block spec (native or the
 * custom `callout`), so they render with real formatting, drag handles and slash
 * entries. Everything else (image, namespaced/custom blocks) round-trips through
 * the generic `disnoteBlock` wrapper so no data is ever lost.
 */
const DIRECT_TYPES = new Set([
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "checklistItem",
  "toggle",
  "quote",
  "codeBlock",
  "divider",
  "callout",
  "table",
  "image",
  "video",
  "audio",
  "file",
  "math",
  "tableOfContents",
  "breadcrumb",
  "syncedBlock",
  "templateButton",
  "toggleHeading1",
  "toggleHeading2",
  "toggleHeading3",
  "bookmark",
  "tableDb",
  "board",
  "listDb",
  "gallery",
  "calendar",
  "timeline",
  "map",
  "columnList",
  "column",
]);

/** DisNote types that carry no inline `content` (data lives in props). */
const NO_CONTENT_TYPES = new Set([
  "divider",
  "codeBlock",
  "table",
  "image",
  "video",
  "audio",
  "file",
  "math",
  "tableOfContents",
  "breadcrumb",
  "bookmark",
  "tableDb",
  "board",
  "listDb",
  "gallery",
  "calendar",
  "timeline",
  "map",
  "columnList",
  "column",
]);

const GENERIC_BLOCK_TYPE = "disnoteBlock";

const CALLOUT_INTENTS = new Set(["info", "warning", "success", "danger"]);

function clampHeadingLevel(value: unknown): 1 | 2 | 3 {
  return value === 2 ? 2 : (typeof value === "number" && value >= 3) ? 3 : 1;
}

function readIntent(value: unknown): "info" | "warning" | "success" | "danger" {
  return typeof value === "string" && CALLOUT_INTENTS.has(value)
    ? (value as "info" | "warning" | "success" | "danger")
    : "info";
}

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
  if (styles.textColor && styles.textColor !== "default") marks.push({ type: "textColor", value: styles.textColor });
  if (styles.backgroundColor && styles.backgroundColor !== "default") {
    marks.push({ type: "backgroundColor", value: styles.backgroundColor });
  }
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

function codeText(code: string): BnInlineContent[] {
  return code ? [{ type: "text", text: code, styles: {} }] : [];
}

export function blockToBn(block: DisNoteBlock): BnBlock {
  const children = (block.children ?? []).map(blockToBn);

  if (DIRECT_TYPES.has(block.type)) {
    const type = TO_BN_TYPE[block.type] ?? block.type;
    const props: Record<string, unknown> = {};
    let content: BnInlineContent[] | Record<string, unknown>;

    switch (block.type) {
      case "heading":
        props["level"] = clampHeadingLevel(block.props["level"]);
        content = inlineToBn(block.content);
        break;
      case "checklistItem":
        props["checked"] = block.props["checked"] === true;
        content = inlineToBn(block.content);
        break;
      case "callout":
        props["intent"] = readIntent(block.props["intent"]);
        content = inlineToBn(block.content);
        break;
      case "codeBlock":
        props["language"] = typeof block.props["language"] === "string" ? block.props["language"] : "text";
        content = codeText(typeof block.props["code"] === "string" ? (block.props["code"] as string) : "");
        break;
      case "divider":
        content = [];
        break;
      case "table": {
        props["textColor"] = block.props["textColor"] ?? "default";
        const rows = (block.props["rows"] as unknown) as Array<{ cells?: DisNoteInline[][] }> || [];
        content = {
          type: "tableContent",
          rows: rows.map((row) => ({
            cells: (row.cells ?? []).map((cell) => inlineToBn(cell)),
          })),
        };
        break;
      }
      case "image":
      case "video":
      case "audio":
      case "file":
        props["url"] = block.props["url"] || block.props["assetId"] || "";
        props["caption"] = block.props["caption"] || block.props["alt"] || "";
        if (block.props["name"]) props["name"] = block.props["name"];
        if (typeof block.props["width"] === "number") props["width"] = block.props["width"];
        content = [];
        break;
      default:
        for (const [k, v] of Object.entries(block.props)) {
          props[k] = v;
        }
        content = inlineToBn(block.content);
    }

    return { id: block.id, type, props, content, children };
  }

  // Generic wrapper: preserves image + any unknown/namespaced block losslessly.
  return {
    id: block.id,
    type: GENERIC_BLOCK_TYPE,
    props: {
      originalType: block.type,
      originalVersion: block.version,
      propsJson: JSON.stringify(block.props),
    },
    content: inlineToBn(block.content),
    children,
  };
}

function readVersion(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 1;
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

function joinCode(content: BnInlineContent[] | undefined): string {
  return (content ?? [])
    .filter((node): node is BnStyledText => node.type === "text")
    .map((node) => node.text)
    .join("");
}

export function blockFromBn(bn: BnBlock, envelope?: EnvelopeMeta): DisNoteBlock {
  if (bn.type === GENERIC_BLOCK_TYPE) {
    const type = typeof bn.props["originalType"] === "string" ? bn.props["originalType"] : "paragraph";
    const props = readPropsJson(bn.props["propsJson"]);
    const block: DisNoteBlock = {
      id: bn.id,
      type,
      version: readVersion(bn.props["originalVersion"]),
      props,
    };
    if (!NO_CONTENT_TYPES.has(type) && type !== "image") {
      block.content = inlineFromBn(Array.isArray(bn.content) ? bn.content : undefined);
    }
    const children = (bn.children ?? []).map((child) => blockFromBn(child, envelope));
    if (children.length > 0) block.children = children;
    return block;
  }

  const type = FROM_BN_TYPE[bn.type] ?? bn.type;
  const props: Record<string, unknown> = {};

  switch (type) {
    case "heading":
      props["level"] = clampHeadingLevel(bn.props["level"]);
      break;
    case "checklistItem":
      props["checked"] = bn.props["checked"] === true;
      break;
    case "callout":
      props["intent"] = readIntent(bn.props["intent"]);
      break;
    case "codeBlock":
      props["language"] = typeof bn.props["language"] === "string" ? bn.props["language"] : "text";
      props["code"] = joinCode(Array.isArray(bn.content) ? bn.content : undefined);
      break;
    case "table": {
      const tableContent = bn.content as unknown as { rows?: Array<{ cells?: BnInlineContent[][] }> };
      const rows = (tableContent?.rows || []).map((row) => ({
        cells: (row.cells || []).map((cell) => inlineFromBn(cell)),
      }));
      props["rows"] = rows;
      props["textColor"] = bn.props["textColor"] ?? "default";
      break;
    }
    case "image":
      props["assetId"] = bn.props["url"] || "";
      props["alt"] = bn.props["caption"] || "";
      break;
    case "video":
    case "audio":
    case "file":
      props["url"] = bn.props["url"] || "";
      props["caption"] = bn.props["caption"] || "";
      if (bn.props["name"]) props["name"] = bn.props["name"];
      if (bn.props["width"]) props["width"] = bn.props["width"];
      break;
    default:
      for (const [k, v] of Object.entries(bn.props)) {
        props[k] = v;
      }
      break;
  }

  const block: DisNoteBlock = {
    id: bn.id,
    type,
    version: readVersion(envelope?.blockVersions[bn.id]),
    props: props as DisNoteBlock["props"],
  };
  if (!NO_CONTENT_TYPES.has(type)) {
    block.content = inlineFromBn(Array.isArray(bn.content) ? bn.content : undefined);
  }

  const children = (bn.children ?? []).map((child) => blockFromBn(child, envelope));
  if (children.length > 0) block.children = children;
  return block;
}
