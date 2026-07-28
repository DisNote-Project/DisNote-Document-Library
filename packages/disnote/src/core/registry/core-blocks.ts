import { LIBRARY_MESSAGES } from "../messages.js";
import type { JsonValue } from "../model/json.js";
import type {
  CoreBlockDefinition,
  BlockCapabilities,
  ValidationResult,
} from "./index.js";
import {
  defineCoreBlock,
  ok,
  fail,
  issue,
  createBlockRegistry,
} from "./index.js";
import type { BlockRegistry } from "./index.js";
import { extractInlineText } from "../serialization/plaintext.js";
import { safeUrl } from "../security/index.js";

const INLINE: BlockCapabilities = {
  inlineContent: true,
  children: false,
  selectable: true,
  draggable: true,
  commentable: true,
};

const CONTAINER: BlockCapabilities = {
  inlineContent: true,
  children: true,
  selectable: true,
  draggable: true,
  commentable: true,
};

const VOID: BlockCapabilities = {
  inlineContent: false,
  children: false,
  selectable: true,
  draggable: true,
  commentable: true,
};

const CHILDREN_ONLY: BlockCapabilities = {
  inlineContent: false,
  children: true,
  selectable: true,
  draggable: true,
  commentable: true,
};

function isObject(v: unknown): v is Record<string, JsonValue> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function safeOptionalUrl(value: JsonValue | undefined): string | null {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string") return null;
  return safeUrl(value, {
    allowedSchemes: ["https:", "http:", "mailto:", "tel:"],
  });
}

/* -------------------------------- text blocks ----------------------------- */

export const paragraphCore = defineCoreBlock<Record<string, JsonValue>>({
  type: "paragraph",
  version: 1,
  capabilities: INLINE,
  validateProps: (input) => (isObject(input) ? ok(input) : ok({})),
  toPlainText: (block) => extractInlineText(block.content),
});

interface HeadingProps extends Record<string, JsonValue> {
  level: number;
}

export const headingCore = defineCoreBlock<HeadingProps>({
  type: "heading",
  version: 1,
  capabilities: INLINE,
  validateProps: (input) => {
    if (!isObject(input))
      return fail([
        issue("props", "invalid", LIBRARY_MESSAGES.HEADING_PROPS_OBJECT),
      ]);
    const level = input["level"];
    if (level !== 1 && level !== 2 && level !== 3) {
      return fail([
        issue("props.level", "invalid", LIBRARY_MESSAGES.HEADING_LEVEL_INVALID),
      ]);
    }
    return ok({ ...input, level });
  },
  toPlainText: (block) => extractInlineText(block.content),
});

function listItem(type: string): CoreBlockDefinition {
  return defineCoreBlock<Record<string, JsonValue>>({
    type,
    version: 1,
    capabilities: CONTAINER,
    validateProps: (input) => (isObject(input) ? ok(input) : ok({})),
    toPlainText: (block) => extractInlineText(block.content),
  });
}

export const bulletListItemCore = listItem("bulletListItem");
export const numberedListItemCore = listItem("numberedListItem");

/** A collapsible toggle: inline heading text plus revealed child blocks. */
export const toggleCore = listItem("toggle");

interface ChecklistProps extends Record<string, JsonValue> {
  checked: boolean;
}

export const checklistItemCore = defineCoreBlock<ChecklistProps>({
  type: "checklistItem",
  version: 1,
  capabilities: CONTAINER,
  validateProps: (input) => {
    if (!isObject(input)) return ok({ checked: false });
    return ok({ ...input, checked: input["checked"] === true });
  },
  toPlainText: (block) => extractInlineText(block.content),
});

export const quoteCore = defineCoreBlock<Record<string, JsonValue>>({
  type: "quote",
  version: 1,
  capabilities: INLINE,
  validateProps: (input) => (isObject(input) ? ok(input) : ok({})),
  toPlainText: (block) => extractInlineText(block.content),
});

/* -------------------------------- void blocks ----------------------------- */

interface CodeProps extends Record<string, JsonValue> {
  language: string;
  code: string;
}

export const codeBlockCore = defineCoreBlock<CodeProps>({
  type: "codeBlock",
  version: 1,
  capabilities: VOID,
  validateProps: (input) => {
    if (!isObject(input))
      return fail([
        issue("props", "invalid", LIBRARY_MESSAGES.CODE_BLOCK_PROPS_OBJECT),
      ]);
    const code =
      typeof input["code"] === "string" ? (input["code"] as string) : "";
    const language =
      typeof input["language"] === "string"
        ? (input["language"] as string)
        : "text";
    return ok({ ...input, code, language });
  },
  toPlainText: (block) =>
    typeof block.props.code === "string" ? block.props.code : "",
});

interface ImageProps extends Record<string, JsonValue> {
  assetId: string;
  alt: string;
}

export const imageCore = defineCoreBlock<ImageProps>({
  type: "image",
  version: 1,
  capabilities: VOID,
  validateProps: (input) => {
    if (!isObject(input))
      return fail([
        issue("props", "invalid", LIBRARY_MESSAGES.IMAGE_PROPS_OBJECT),
      ]);
    if (typeof input["assetId"] !== "string" || input["assetId"].length === 0) {
      return fail([
        issue(
          "props.assetId",
          "required",
          LIBRARY_MESSAGES.IMAGE_ASSET_ID_REQUIRED
        ),
      ]);
    }
    const alt =
      typeof input["alt"] === "string" ? (input["alt"] as string) : "";
    return ok({ ...input, assetId: input["assetId"] as string, alt });
  },
  toPlainText: (block) =>
    typeof block.props.alt === "string" ? block.props.alt : "",
});

export const dividerCore = defineCoreBlock<Record<string, JsonValue>>({
  type: "divider",
  version: 1,
  capabilities: VOID,
  validateProps: () => ok({}),
  toPlainText: () => "",
});

interface CalloutProps extends Record<string, JsonValue> {
  intent: "info" | "warning" | "success" | "danger";
}

const CALLOUT_INTENTS = ["info", "warning", "success", "danger"] as const;

export const calloutCore = defineCoreBlock<CalloutProps>({
  type: "callout",
  version: 1,
  capabilities: CONTAINER,
  validateProps: (input) => {
    if (!isObject(input)) return ok({ intent: "info" });
    const raw = input["intent"];
    const intent = (CALLOUT_INTENTS as readonly string[]).includes(
      raw as string
    )
      ? (raw as CalloutProps["intent"])
      : "info";
    return ok({ ...input, intent });
  },
  toPlainText: (block) => extractInlineText(block.content),
});

/* ------------------------------- notion blocks ---------------------------- */

export const tableCore = defineCoreBlock<Record<string, JsonValue>>({
  type: "table",
  version: 1,
  capabilities: VOID, // Grid data is stored in props, so no native inline content/children at block root
  validateProps: (input) => {
    if (!isObject(input)) return ok({ rows: [] });
    if (!Array.isArray(input["rows"])) {
      return fail([
        issue("props.rows", "invalid", LIBRARY_MESSAGES.TABLE_ROWS_ARRAY),
      ]);
    }
    return ok(input);
  },
  toPlainText: () => "[Table]",
});

export const mathCore = defineCoreBlock<Record<string, JsonValue>>({
  type: "math",
  version: 1,
  capabilities: VOID,
  validateProps: (input) => {
    if (!isObject(input)) return ok({ code: "" });
    return ok({ code: typeof input["code"] === "string" ? input["code"] : "" });
  },
  toPlainText: (block) =>
    typeof block.props.code === "string" ? block.props.code : "",
});

export const tableOfContentsCore = defineCoreBlock<Record<string, JsonValue>>({
  type: "tableOfContents",
  version: 1,
  capabilities: VOID,
  validateProps: () => ok({}),
  toPlainText: () => "[Table of Contents]",
});

export const breadcrumbCore = defineCoreBlock<Record<string, JsonValue>>({
  type: "breadcrumb",
  version: 1,
  capabilities: VOID,
  validateProps: () => ok({}),
  toPlainText: () => "[Breadcrumbs]",
});

export const syncedBlockCore = defineCoreBlock<Record<string, JsonValue>>({
  type: "syncedBlock",
  version: 1,
  capabilities: CONTAINER,
  validateProps: (input) => {
    if (!isObject(input)) return ok({ syncedBlockId: "" });
    return ok({
      syncedBlockId:
        typeof input["syncedBlockId"] === "string"
          ? input["syncedBlockId"]
          : "",
    });
  },
  toPlainText: () => "",
});

export const templateButtonCore = defineCoreBlock<Record<string, JsonValue>>({
  type: "templateButton",
  version: 1,
  capabilities: CONTAINER,
  validateProps: (input) => {
    if (!isObject(input)) return ok({ label: "Template Button" });
    return ok({
      ...input,
      label:
        typeof input["label"] === "string" ? input["label"] : "Template Button",
    });
  },
  toPlainText: () => "",
});

export const toggleHeading1Core = defineCoreBlock<Record<string, JsonValue>>({
  type: "toggleHeading1",
  version: 1,
  capabilities: CONTAINER,
  validateProps: (input) => (isObject(input) ? ok(input) : ok({})),
  toPlainText: (block) => extractInlineText(block.content),
});

export const toggleHeading2Core = defineCoreBlock<Record<string, JsonValue>>({
  type: "toggleHeading2",
  version: 1,
  capabilities: CONTAINER,
  validateProps: (input) => (isObject(input) ? ok(input) : ok({})),
  toPlainText: (block) => extractInlineText(block.content),
});

export const toggleHeading3Core = defineCoreBlock<Record<string, JsonValue>>({
  type: "toggleHeading3",
  version: 1,
  capabilities: CONTAINER,
  validateProps: (input) => (isObject(input) ? ok(input) : ok({})),
  toPlainText: (block) => extractInlineText(block.content),
});

export const bookmarkCore = defineCoreBlock<Record<string, JsonValue>>({
  type: "bookmark",
  version: 1,
  capabilities: VOID,
  validateProps: (input) => {
    if (!isObject(input)) return ok({ url: "" });
    const url = safeOptionalUrl(input["url"]);
    const image = safeOptionalUrl(input["image"]);
    const issues = [];
    if (url === null)
      issues.push(
        issue("props.url", "unsafe-url", LIBRARY_MESSAGES.BOOKMARK_URL_UNSAFE)
      );
    if (image === null)
      issues.push(
        issue(
          "props.image",
          "unsafe-url",
          LIBRARY_MESSAGES.BOOKMARK_IMAGE_UNSAFE
        )
      );
    if (issues.length > 0) return fail(issues);
    return ok({
      url: url ?? "",
      title: typeof input["title"] === "string" ? input["title"] : "",
      description:
        typeof input["description"] === "string" ? input["description"] : "",
      image: image ?? "",
    });
  },
  toPlainText: (block) =>
    typeof block.props.url === "string" ? block.props.url : "",
});

function mediaItem(type: string): CoreBlockDefinition {
  return defineCoreBlock<Record<string, JsonValue>>({
    type,
    version: 1,
    capabilities: VOID,
    validateProps: (input) => {
      if (!isObject(input)) return ok({ url: "" });
      const url = safeOptionalUrl(input["url"]);
      if (url === null) {
        return fail([
          issue(
            "props.url",
            "unsafe-url",
            LIBRARY_MESSAGES.mediaUrlUnsafe(type)
          ),
        ]);
      }
      const width = input["width"];
      if (
        width !== undefined &&
        (typeof width !== "number" || !Number.isFinite(width) || width <= 0)
      ) {
        return fail([
          issue(
            "props.width",
            "invalid",
            LIBRARY_MESSAGES.mediaWidthInvalid(type)
          ),
        ]);
      }
      return ok({
        url: url ?? "",
        caption: typeof input["caption"] === "string" ? input["caption"] : "",
        name: typeof input["name"] === "string" ? input["name"] : "",
        ...(typeof width === "number" ? { width } : {}),
      });
    },
    toPlainText: (block) =>
      typeof block.props.url === "string" ? block.props.url : "",
  });
}

export const videoCore = mediaItem("video");
export const audioCore = mediaItem("audio");
export const fileCore = mediaItem("file");

function dbViewItem(type: string): CoreBlockDefinition {
  return defineCoreBlock<Record<string, JsonValue>>({
    type,
    version: 1,
    capabilities: VOID,
    validateProps: (input) => {
      if (!isObject(input)) return ok({ databaseId: "" });
      return ok({
        ...input,
        databaseId:
          typeof input["databaseId"] === "string" ? input["databaseId"] : "",
        title: typeof input["title"] === "string" ? input["title"] : "Database",
      });
    },
    toPlainText: () => `[Database ${type}]`,
  });
}

export const tableDbCore = dbViewItem("tableDb");
export const boardCore = dbViewItem("board");
export const listDbCore = dbViewItem("listDb");
export const galleryCore = dbViewItem("gallery");
export const calendarCore = dbViewItem("calendar");
export const timelineCore = dbViewItem("timeline");
export const mapCore = dbViewItem("map");

export const columnListCore = defineCoreBlock<Record<string, JsonValue>>({
  type: "columnList",
  version: 1,
  capabilities: CHILDREN_ONLY,
  validateProps: (input) => (isObject(input) ? ok(input) : ok({})),
  toPlainText: () => "",
});

export const columnCore = defineCoreBlock<Record<string, JsonValue>>({
  type: "column",
  version: 1,
  capabilities: CHILDREN_ONLY,
  validateProps: (input) => {
    if (!isObject(input)) return ok({});
    const width = input["width"];
    if (
      width !== undefined &&
      (typeof width !== "number" ||
        !Number.isFinite(width) ||
        width <= 0 ||
        width > 1)
    ) {
      return fail([
        issue("props.width", "invalid", LIBRARY_MESSAGES.COLUMN_WIDTH_INVALID),
      ]);
    }
    return ok(input);
  },
  toPlainText: () => "",
});

/** All V1 core block definitions. */
export const coreBlockDefinitions: CoreBlockDefinition[] = [
  paragraphCore,
  headingCore,
  bulletListItemCore,
  numberedListItemCore,
  toggleCore,
  checklistItemCore,
  quoteCore,
  codeBlockCore,
  imageCore,
  dividerCore,
  calloutCore,
  tableCore,
  mathCore,
  tableOfContentsCore,
  breadcrumbCore,
  syncedBlockCore,
  templateButtonCore,
  toggleHeading1Core,
  toggleHeading2Core,
  toggleHeading3Core,
  bookmarkCore,
  videoCore,
  audioCore,
  fileCore,
  tableDbCore,
  boardCore,
  listDbCore,
  galleryCore,
  calendarCore,
  timelineCore,
  mapCore,
  columnListCore,
  columnCore,
];

/** A registry seeded with every V1 core block. */
export function createDefaultRegistry(): BlockRegistry {
  return createBlockRegistry(coreBlockDefinitions);
}

export type {
  HeadingProps,
  ChecklistProps,
  CodeProps,
  ImageProps,
  CalloutProps,
  ValidationResult,
};
