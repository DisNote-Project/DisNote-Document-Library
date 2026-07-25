import type { JsonValue } from "../model/json.js";
import type { CoreBlockDefinition, BlockCapabilities, ValidationResult } from "./index.js";
import { defineCoreBlock, ok, fail, issue, createBlockRegistry } from "./index.js";
import type { BlockRegistry } from "./index.js";
import { extractInlineText } from "../serialization/plaintext.js";

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

function isObject(v: unknown): v is Record<string, JsonValue> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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
    if (!isObject(input)) return fail([issue("props", "invalid", "heading props must be an object")]);
    const level = input["level"];
    if (level !== 1 && level !== 2 && level !== 3) {
      return fail([issue("props.level", "invalid", "heading level must be 1, 2 or 3")]);
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
    if (!isObject(input)) return fail([issue("props", "invalid", "codeBlock props must be an object")]);
    const code = typeof input["code"] === "string" ? (input["code"] as string) : "";
    const language = typeof input["language"] === "string" ? (input["language"] as string) : "text";
    return ok({ ...input, code, language });
  },
  toPlainText: (block) => (typeof block.props.code === "string" ? block.props.code : ""),
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
    if (!isObject(input)) return fail([issue("props", "invalid", "image props must be an object")]);
    if (typeof input["assetId"] !== "string" || input["assetId"].length === 0) {
      return fail([issue("props.assetId", "required", "image requires a non-empty assetId")]);
    }
    const alt = typeof input["alt"] === "string" ? (input["alt"] as string) : "";
    return ok({ ...input, assetId: input["assetId"] as string, alt });
  },
  toPlainText: (block) => (typeof block.props.alt === "string" ? block.props.alt : ""),
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
    const intent = (CALLOUT_INTENTS as readonly string[]).includes(raw as string)
      ? (raw as CalloutProps["intent"])
      : "info";
    return ok({ ...input, intent });
  },
  toPlainText: (block) => extractInlineText(block.content),
});

/** All V1 core block definitions. */
export const coreBlockDefinitions: CoreBlockDefinition[] = [
  paragraphCore,
  headingCore,
  bulletListItemCore,
  numberedListItemCore,
  checklistItemCore,
  quoteCore,
  codeBlockCore,
  imageCore,
  dividerCore,
  calloutCore,
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
