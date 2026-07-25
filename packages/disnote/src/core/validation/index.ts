import type { JsonValue } from "../model/json.js";
import type { DisNoteInline, TextMark } from "../model/inline.js";
import type { DisNoteBlock, DisNoteDocument } from "../model/document.js";
import { CURRENT_SCHEMA_VERSION, DOCUMENT_FORMAT } from "../model/document.js";
import type { BlockRegistry, ValidationResult } from "../registry/index.js";
import type { DocumentIssue } from "../errors/index.js";
import { isJsonValue } from "../model/json.js";

export interface ValidateOptions {
  /** When set, known block types have their props validated. */
  registry?: BlockRegistry;
  /** Maximum nesting depth allowed (from a preset policy). */
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

const UNSAFE_SCHEME = /^\s*(javascript|vbscript|file|data):/i;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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
    issues.add(path, "invalid", "marks must be an array");
    return;
  }
  marks.forEach((mark: unknown, i) => {
    if (!isPlainObject(mark) || typeof (mark as { type?: unknown }).type !== "string") {
      issues.add(`${path}[${i}]`, "invalid", "mark must have a string type");
      return;
    }
    const type = (mark as TextMark).type;
    if (!MARK_TYPES.has(type)) {
      issues.add(`${path}[${i}]`, "unknown-mark", `unknown mark "${type}"`);
    } else if (
      (type === "textColor" || type === "backgroundColor") &&
      typeof (mark as { value?: unknown }).value !== "string"
    ) {
      issues.add(`${path}[${i}].value`, "invalid", `${type} requires a string value`);
    }
  });
}

function validateInline(content: unknown, path: string, issues: Issues): void {
  if (content === undefined) return;
  if (!Array.isArray(content)) {
    issues.add(path, "invalid", "content must be an array of inline nodes");
    return;
  }
  content.forEach((node: unknown, i) => {
    const p = `${path}[${i}]`;
    if (!isPlainObject(node) || typeof (node as { type?: unknown }).type !== "string") {
      issues.add(p, "invalid", "inline node must have a string type");
      return;
    }
    const inline = node as unknown as DisNoteInline;
    switch (inline.type) {
      case "text":
        if (typeof inline.text !== "string") issues.add(`${p}.text`, "invalid", "text must be a string");
        validateMarks((inline as { marks?: unknown }).marks, `${p}.marks`, issues);
        break;
      case "link":
        if (typeof inline.href !== "string") issues.add(`${p}.href`, "invalid", "link href must be a string");
        else if (UNSAFE_SCHEME.test(inline.href)) issues.add(`${p}.href`, "unsafe-url", "unsafe URL scheme");
        validateInline(inline.content, `${p}.content`, issues);
        break;
      case "mention":
        if (typeof inline.entityId !== "string" || typeof inline.label !== "string") {
          issues.add(p, "invalid", "mention requires entityId and label strings");
        }
        break;
      case "reference":
        if (typeof inline.targetId !== "string" || typeof inline.label !== "string") {
          issues.add(p, "invalid", "reference requires targetId and label strings");
        }
        break;
      default:
        issues.add(p, "unknown-inline", `unknown inline type "${(inline as { type: string }).type}"`);
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
  issues: Issues,
): void {
  if (!Array.isArray(blocks)) {
    issues.add(path, "invalid", "blocks must be an array");
    return;
  }
  if (options.maxDepth !== undefined && depth > options.maxDepth) {
    issues.add(path, "max-depth", `nesting depth ${depth} exceeds preset max ${options.maxDepth}`);
    return;
  }
  blocks.forEach((raw: unknown, i) => {
    const p = `${path}[${i}]`;
    if (!isPlainObject(raw)) {
      issues.add(p, "invalid", "block must be an object");
      return;
    }
    if (seenRefs.has(raw as object)) {
      issues.add(p, "cycle", "block graph contains a cycle");
      return;
    }
    seenRefs.add(raw as object);

    const block = raw as Partial<DisNoteBlock>;
    if (typeof block.id !== "string" || block.id.length === 0) {
      issues.add(`${p}.id`, "invalid", "block id must be a non-empty string");
    } else if (seenIds.has(block.id)) {
      issues.add(`${p}.id`, "duplicate-id", `duplicate block id "${block.id}"`);
    } else {
      seenIds.add(block.id);
    }

    if (typeof block.type !== "string" || block.type.length === 0) {
      issues.add(`${p}.type`, "invalid", "block type must be a non-empty string");
    }
    if (typeof block.version !== "number" || !Number.isInteger(block.version) || block.version < 1) {
      issues.add(`${p}.version`, "invalid", "block version must be a positive integer");
    }
    if (!isPlainObject(block.props)) {
      issues.add(`${p}.props`, "invalid", "block props must be an object");
    } else if (!isJsonValue(block.props as JsonValue)) {
      issues.add(`${p}.props`, "not-json", "block props must be JSON-safe");
    }

    validateInline(block.content, `${p}.content`, issues);

    if (typeof block.type === "string" && options.registry) {
      const def = options.registry.get(block.type);
      if (!def) {
        if (options.strictUnknownBlocks) {
          issues.add(`${p}.type`, "unknown-block", `block type "${block.type}" is not registered`);
        }
        // otherwise: unknown block is preserved, not an error.
      } else {
        if (!def.capabilities.inlineContent && (block.content?.length ?? 0) > 0) {
          issues.add(`${p}.content`, "unsupported-content", `block "${block.type}" does not support inline content`);
        }
        if (!def.capabilities.children && (block.children?.length ?? 0) > 0) {
          issues.add(`${p}.children`, "unsupported-children", `block "${block.type}" does not support children`);
        }
        if (isPlainObject(block.props)) {
          const result = def.validateProps(block.props);
          if (!result.ok) {
            for (const it of result.issues) issues.add(`${p}.${it.path}`, it.code, it.message);
          }
        }
      }
    }

    if (block.children !== undefined) {
      validateBlockTree(block.children, `${p}.children`, depth + 1, seenIds, seenRefs, options, issues);
    }
  });
}

/** Validate an untrusted value as a DisNoteDocument. */
export function validateDocument(input: unknown, options: ValidateOptions = {}): ValidationResult<DisNoteDocument> {
  const issues = new Issues();

  if (!isPlainObject(input)) {
    return { ok: false, issues: [{ path: "", code: "invalid", message: "document must be an object" }] };
  }
  const doc = input as Partial<DisNoteDocument>;

  if (doc.format !== DOCUMENT_FORMAT) {
    issues.add("format", "invalid", `format must be "${DOCUMENT_FORMAT}"`);
  }
  if (typeof doc.schemaVersion !== "number" || !Number.isInteger(doc.schemaVersion) || doc.schemaVersion < 0) {
    issues.add("schemaVersion", "invalid", "schemaVersion must be a non-negative integer");
  } else if (doc.schemaVersion > CURRENT_SCHEMA_VERSION) {
    issues.add(
      "schemaVersion",
      "unsupported-future-version",
      `schemaVersion ${doc.schemaVersion} is newer than supported version ${CURRENT_SCHEMA_VERSION}`,
    );
  }
  if (typeof doc.id !== "string" || doc.id.length === 0) {
    issues.add("id", "invalid", "document id must be a non-empty string");
  }
  if (!isPlainObject(doc.metadata)) {
    issues.add("metadata", "invalid", "metadata must be an object");
  } else {
    if (typeof doc.metadata.createdAt !== "string" || Number.isNaN(Date.parse(doc.metadata.createdAt))) {
      issues.add("metadata.createdAt", "invalid", "createdAt must be an ISO date string");
    }
    if (typeof doc.metadata.updatedAt !== "string" || Number.isNaN(Date.parse(doc.metadata.updatedAt))) {
      issues.add("metadata.updatedAt", "invalid", "updatedAt must be an ISO date string");
    }
  }

  validateBlockTree(doc.blocks, "blocks", 0, new Set<string>(), new WeakSet<object>(), options, issues);

  if (issues.list.length > 0) return { ok: false, issues: issues.list };
  return { ok: true, value: input as unknown as DisNoteDocument };
}

/** Validate a single block subtree (used by transformations and imports). */
export function validateBlock(input: unknown, options: ValidateOptions = {}): ValidationResult<DisNoteBlock> {
  const issues = new Issues();
  validateBlockTree([input], "block", 0, new Set<string>(), new WeakSet<object>(), options, issues);
  if (issues.list.length > 0) return { ok: false, issues: issues.list };
  return { ok: true, value: input as DisNoteBlock };
}
