import { LIBRARY_MESSAGES } from "../messages.js";
import type { JsonValue } from "../model/json.js";
import type { DisNoteInline, TextMark } from "../model/inline.js";
import type { DisNoteBlock, DisNoteDocument } from "../model/document.js";
import { CURRENT_SCHEMA_VERSION, DOCUMENT_FORMAT } from "../model/document.js";
import type { BlockRegistry, ValidationResult } from "../registry/index.js";
import type { DocumentIssue } from "../errors/index.js";
import { isJsonValue } from "../model/json.js";
import { safeColor, safeUrl } from "../security/index.js";

export interface ValidateOptions {
  /** When set, known block types have their props validated. */
  registry?: BlockRegistry;
  /** Maximum nesting depth allowed. Defaults to 100 to bound untrusted input. */
  maxDepth?: number;
  /**
   * When true, an unknown block type (not in the registry) is an error.
   * Default false: unknown blocks are preserved, per the format contract.
   */
  strictUnknownBlocks?: boolean;
}

const MARK_TYPES = new Set([
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "textColor",
  "backgroundColor",
]);

const MENTION_ENTITY_TYPES = new Set(["user", "channel"]);
const REFERENCE_TARGET_TYPES = new Set(["task", "document", "message", "file"]);
const DEFAULT_MAX_DEPTH = 100;
const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isIsoDateString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ISO_DATE_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

class Issues {
  readonly list: DocumentIssue[] = [];
  add(path: string, code: string, message: string): void {
    this.list.push({ path, code, message });
  }
}

function validateMarks(marks: unknown, path: string, issues: Issues): void {
  if (marks === undefined) return;
  if (!Array.isArray(marks)) {
    issues.add(path, "invalid", LIBRARY_MESSAGES.MARKS_ARRAY);
    return;
  }
  marks.forEach((mark: unknown, i) => {
    if (
      !isPlainObject(mark) ||
      typeof (mark as { type?: unknown }).type !== "string"
    ) {
      issues.add(`${path}[${i}]`, "invalid", LIBRARY_MESSAGES.MARK_TYPE_STRING);
      return;
    }
    const type = (mark as TextMark).type;
    if (!MARK_TYPES.has(type)) {
      issues.add(
        `${path}[${i}]`,
        "unknown-mark",
        LIBRARY_MESSAGES.unknownMark(type)
      );
    } else if (
      (type === "textColor" || type === "backgroundColor") &&
      typeof (mark as { value?: unknown }).value !== "string"
    ) {
      issues.add(
        `${path}[${i}].value`,
        "invalid",
        LIBRARY_MESSAGES.markValueString(type)
      );
    } else if (
      (type === "textColor" || type === "backgroundColor") &&
      safeColor((mark as { value: string }).value) === null
    ) {
      issues.add(
        `${path}[${i}].value`,
        "unsafe-color",
        LIBRARY_MESSAGES.markColorInvalid(type)
      );
    }
  });
}

function validateTextInline(node: unknown, path: string, issues: Issues): void {
  if (!isPlainObject(node) || node.type !== "text") {
    issues.add(path, "invalid", LIBRARY_MESSAGES.LINK_CONTENT_TEXT_ONLY);
    return;
  }
  if (typeof node.text !== "string")
    issues.add(`${path}.text`, "invalid", LIBRARY_MESSAGES.TEXT_STRING);
  validateMarks(node.marks, `${path}.marks`, issues);
}

function validateInline(content: unknown, path: string, issues: Issues): void {
  if (content === undefined) return;
  if (!Array.isArray(content)) {
    issues.add(path, "invalid", LIBRARY_MESSAGES.INLINE_CONTENT_ARRAY);
    return;
  }
  content.forEach((node: unknown, i) => {
    const p = `${path}[${i}]`;
    if (
      !isPlainObject(node) ||
      typeof (node as { type?: unknown }).type !== "string"
    ) {
      issues.add(p, "invalid", LIBRARY_MESSAGES.INLINE_TYPE_STRING);
      return;
    }
    const inline = node as unknown as DisNoteInline;
    switch (inline.type) {
      case "text":
        if (typeof inline.text !== "string")
          issues.add(`${p}.text`, "invalid", LIBRARY_MESSAGES.TEXT_STRING);
        validateMarks(
          (inline as { marks?: unknown }).marks,
          `${p}.marks`,
          issues
        );
        break;
      case "link":
        if (typeof inline.href !== "string")
          issues.add(`${p}.href`, "invalid", LIBRARY_MESSAGES.LINK_HREF_STRING);
        else if (
          safeUrl(inline.href, {
            allowedSchemes: ["https:", "http:", "mailto:", "tel:"],
          }) === null
        ) {
          issues.add(`${p}.href`, "unsafe-url", LIBRARY_MESSAGES.URL_UNSAFE);
        }
        if (!Array.isArray(inline.content)) {
          issues.add(
            `${p}.content`,
            "invalid",
            LIBRARY_MESSAGES.LINK_CONTENT_ARRAY
          );
        } else {
          inline.content.forEach((child, childIndex) =>
            validateTextInline(child, `${p}.content[${childIndex}]`, issues)
          );
        }
        break;
      case "mention":
        if (!MENTION_ENTITY_TYPES.has(inline.entityType)) {
          issues.add(
            `${p}.entityType`,
            "invalid",
            LIBRARY_MESSAGES.MENTION_ENTITY_TYPE_INVALID
          );
        }
        if (
          typeof inline.entityId !== "string" ||
          inline.entityId.length === 0
        ) {
          issues.add(
            `${p}.entityId`,
            "invalid",
            LIBRARY_MESSAGES.MENTION_ENTITY_ID_REQUIRED
          );
        }
        if (typeof inline.label !== "string")
          issues.add(
            `${p}.label`,
            "invalid",
            LIBRARY_MESSAGES.MENTION_LABEL_STRING
          );
        break;
      case "reference":
        if (!REFERENCE_TARGET_TYPES.has(inline.targetType)) {
          issues.add(
            `${p}.targetType`,
            "invalid",
            LIBRARY_MESSAGES.REFERENCE_TARGET_TYPE_UNSUPPORTED
          );
        }
        if (
          typeof inline.targetId !== "string" ||
          inline.targetId.length === 0
        ) {
          issues.add(
            `${p}.targetId`,
            "invalid",
            LIBRARY_MESSAGES.REFERENCE_TARGET_ID_REQUIRED
          );
        }
        if (typeof inline.label !== "string")
          issues.add(
            `${p}.label`,
            "invalid",
            LIBRARY_MESSAGES.REFERENCE_LABEL_STRING
          );
        break;
      default:
        issues.add(
          p,
          "unknown-inline",
          LIBRARY_MESSAGES.unknownInlineType((inline as { type: string }).type)
        );
    }
  });
}

function validateBlockTree(
  blocks: unknown,
  path: string,
  depth: number,
  seenIds: Set<string>,
  seenRefs: WeakSet<object>,
  options: ValidateOptions,
  issues: Issues
): void {
  if (!Array.isArray(blocks)) {
    issues.add(path, "invalid", LIBRARY_MESSAGES.BLOCKS_ARRAY);
    return;
  }
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (depth > maxDepth) {
    issues.add(
      path,
      "max-depth",
      LIBRARY_MESSAGES.maxDepthExceeded(depth, maxDepth)
    );
    return;
  }
  blocks.forEach((raw: unknown, i) => {
    const p = `${path}[${i}]`;
    if (!isPlainObject(raw)) {
      issues.add(p, "invalid", LIBRARY_MESSAGES.BLOCK_OBJECT);
      return;
    }
    if (seenRefs.has(raw as object)) {
      issues.add(p, "cycle", LIBRARY_MESSAGES.BLOCK_CYCLE);
      return;
    }
    seenRefs.add(raw as object);

    const block = raw as Partial<DisNoteBlock>;
    if (typeof block.id !== "string" || block.id.length === 0) {
      issues.add(`${p}.id`, "invalid", LIBRARY_MESSAGES.BLOCK_ID_REQUIRED);
    } else if (seenIds.has(block.id)) {
      issues.add(
        `${p}.id`,
        "duplicate-id",
        LIBRARY_MESSAGES.duplicateBlock(block.id)
      );
    } else {
      seenIds.add(block.id);
    }

    if (typeof block.type !== "string" || block.type.length === 0) {
      issues.add(`${p}.type`, "invalid", LIBRARY_MESSAGES.BLOCK_TYPE_REQUIRED);
    }
    if (
      typeof block.version !== "number" ||
      !Number.isInteger(block.version) ||
      block.version < 1
    ) {
      issues.add(
        `${p}.version`,
        "invalid",
        LIBRARY_MESSAGES.BLOCK_VERSION_INVALID
      );
    }
    if (!isPlainObject(block.props)) {
      issues.add(`${p}.props`, "invalid", LIBRARY_MESSAGES.BLOCK_PROPS_OBJECT);
    } else if (!isJsonValue(block.props as JsonValue)) {
      issues.add(`${p}.props`, "not-json", LIBRARY_MESSAGES.BLOCK_PROPS_JSON);
    }

    validateInline(block.content, `${p}.content`, issues);

    if (typeof block.type === "string" && options.registry) {
      const def = options.registry.get(block.type);
      if (!def) {
        if (options.strictUnknownBlocks) {
          issues.add(
            `${p}.type`,
            "unknown-block",
            LIBRARY_MESSAGES.blockTypeNotRegistered(block.type)
          );
        }
        // otherwise: unknown block is preserved, not an error.
      } else {
        if (typeof block.version === "number" && block.version > def.version) {
          issues.add(
            `${p}.version`,
            "unsupported-block-version",
            `block "${block.type}" version ${block.version} is newer than supported version ${def.version}`
          );
        }
        if (
          !def.capabilities.inlineContent &&
          (block.content?.length ?? 0) > 0
        ) {
          issues.add(
            `${p}.content`,
            "unsupported-content",
            LIBRARY_MESSAGES.blockInlineContentUnsupported(block.type)
          );
        }
        if (!def.capabilities.children && (block.children?.length ?? 0) > 0) {
          issues.add(
            `${p}.children`,
            "unsupported-children",
            LIBRARY_MESSAGES.blockChildrenUnsupported(block.type)
          );
        }
        if (isPlainObject(block.props)) {
          const result = def.validateProps(block.props);
          if (!result.ok) {
            for (const it of result.issues)
              issues.add(`${p}.${it.path}`, it.code, it.message);
          }
        }
      }
    }

    if (block.children !== undefined) {
      validateBlockTree(
        block.children,
        `${p}.children`,
        depth + 1,
        seenIds,
        seenRefs,
        options,
        issues
      );
    }
  });
}

/** Validate an untrusted value as a DisNoteDocument. */
export function validateDocument(
  input: unknown,
  options: ValidateOptions = {}
): ValidationResult<DisNoteDocument> {
  const issues = new Issues();

  if (!isPlainObject(input)) {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "invalid",
          message: LIBRARY_MESSAGES.DOCUMENT_MUST_BE_OBJECT,
        },
      ],
    };
  }
  const doc = input as Partial<DisNoteDocument>;

  if (doc.format !== DOCUMENT_FORMAT) {
    issues.add(
      "format",
      "invalid",
      LIBRARY_MESSAGES.invalidFormat(DOCUMENT_FORMAT)
    );
  }
  if (
    typeof doc.schemaVersion !== "number" ||
    !Number.isInteger(doc.schemaVersion) ||
    doc.schemaVersion < 0
  ) {
    issues.add(
      "schemaVersion",
      "invalid",
      LIBRARY_MESSAGES.SCHEMA_VERSION_INVALID
    );
  } else if (doc.schemaVersion > CURRENT_SCHEMA_VERSION) {
    issues.add(
      "schemaVersion",
      "unsupported-future-version",
      `schemaVersion ${doc.schemaVersion} is newer than supported version ${CURRENT_SCHEMA_VERSION}`
    );
  }
  if (typeof doc.id !== "string" || doc.id.length === 0) {
    issues.add("id", "invalid", LIBRARY_MESSAGES.DOCUMENT_ID_REQUIRED);
  }
  if (!isPlainObject(doc.metadata)) {
    issues.add("metadata", "invalid", LIBRARY_MESSAGES.METADATA_OBJECT);
  } else {
    if (
      doc.metadata.title !== undefined &&
      typeof doc.metadata.title !== "string"
    ) {
      issues.add("metadata.title", "invalid", LIBRARY_MESSAGES.TITLE_STRING);
    }
    if (
      doc.metadata.description !== undefined &&
      typeof doc.metadata.description !== "string"
    ) {
      issues.add(
        "metadata.description",
        "invalid",
        LIBRARY_MESSAGES.DESCRIPTION_STRING
      );
    }
    if (
      doc.metadata.locale !== undefined &&
      doc.metadata.locale !== "en" &&
      doc.metadata.locale !== "vi"
    ) {
      issues.add("metadata.locale", "invalid", LIBRARY_MESSAGES.LOCALE_INVALID);
    }
    if (!isIsoDateString(doc.metadata.createdAt)) {
      issues.add(
        "metadata.createdAt",
        "invalid",
        LIBRARY_MESSAGES.CREATED_AT_ISO
      );
    }
    if (!isIsoDateString(doc.metadata.updatedAt)) {
      issues.add(
        "metadata.updatedAt",
        "invalid",
        LIBRARY_MESSAGES.UPDATED_AT_ISO
      );
    }
    if (
      doc.metadata.createdBy !== undefined &&
      typeof doc.metadata.createdBy !== "string"
    ) {
      issues.add(
        "metadata.createdBy",
        "invalid",
        LIBRARY_MESSAGES.CREATED_BY_STRING
      );
    }
    if (
      doc.metadata.tags !== undefined &&
      (!Array.isArray(doc.metadata.tags) ||
        doc.metadata.tags.some((tag) => typeof tag !== "string"))
    ) {
      issues.add("metadata.tags", "invalid", LIBRARY_MESSAGES.TAGS_ARRAY);
    }
    if (
      doc.metadata.attributes !== undefined &&
      (!isPlainObject(doc.metadata.attributes) ||
        !isJsonValue(doc.metadata.attributes as JsonValue))
    ) {
      issues.add(
        "metadata.attributes",
        "not-json",
        LIBRARY_MESSAGES.ATTRIBUTES_JSON
      );
    }
  }

  validateBlockTree(
    doc.blocks,
    "blocks",
    0,
    new Set<string>(),
    new WeakSet<object>(),
    options,
    issues
  );

  if (issues.list.length > 0) return { ok: false, issues: issues.list };
  return { ok: true, value: input as unknown as DisNoteDocument };
}

/** Validate a single block subtree (used by transformations and imports). */
export function validateBlock(
  input: unknown,
  options: ValidateOptions = {}
): ValidationResult<DisNoteBlock> {
  const issues = new Issues();
  validateBlockTree(
    [input],
    "block",
    0,
    new Set<string>(),
    new WeakSet<object>(),
    options,
    issues
  );
  if (issues.list.length > 0) return { ok: false, issues: issues.list };
  return { ok: true, value: input as DisNoteBlock };
}
