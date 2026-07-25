import type { JsonValue } from "../model/json.js";
import type { DisNoteBlock } from "../model/document.js";
import type { DocumentIssue } from "../errors/index.js";

/** A block whose props have been validated to a known shape. */
export interface TypedBlock<Props extends Record<string, JsonValue>> extends DisNoteBlock {
  props: Props;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: DocumentIssue[] };

export interface BlockCapabilities {
  inlineContent: boolean;
  children: boolean;
  selectable: boolean;
  draggable: boolean;
  commentable: boolean;
}

/**
 * The core (platform-neutral) part of a block definition. Renderer and editor
 * registrations are composed in their own packages so core never imports React.
 */
export interface CoreBlockDefinition<Props extends Record<string, JsonValue> = Record<string, JsonValue>> {
  readonly type: string;
  readonly version: number;
  readonly capabilities: BlockCapabilities;
  validateProps(input: unknown): ValidationResult<Props>;
  /** Migrate an older-version block of this type to the current version. */
  migrate(block: DisNoteBlock): DisNoteBlock;
  toPlainText(block: TypedBlock<Props>): string;
}

export interface DefineCoreBlockInput<Props extends Record<string, JsonValue>> {
  type: string;
  version: number;
  capabilities: BlockCapabilities;
  validateProps(input: unknown): ValidationResult<Props>;
  migrate?: (block: DisNoteBlock) => DisNoteBlock;
  toPlainText?: (block: TypedBlock<Props>) => string;
}

export function defineCoreBlock<Props extends Record<string, JsonValue>>(
  input: DefineCoreBlockInput<Props>,
): CoreBlockDefinition<Props> {
  return {
    type: input.type,
    version: input.version,
    capabilities: input.capabilities,
    validateProps: input.validateProps,
    migrate: input.migrate ?? ((block) => block),
    toPlainText: input.toPlainText ?? (() => ""),
  };
}

export interface BlockRegistry {
  has(type: string): boolean;
  get(type: string): CoreBlockDefinition | undefined;
  list(): CoreBlockDefinition[];
  types(): string[];
  register(definition: CoreBlockDefinition): BlockRegistry;
}

class BlockRegistryImpl implements BlockRegistry {
  constructor(private readonly map: Map<string, CoreBlockDefinition>) {}

  has(type: string): boolean {
    return this.map.has(type);
  }

  get(type: string): CoreBlockDefinition | undefined {
    return this.map.get(type);
  }

  list(): CoreBlockDefinition[] {
    return [...this.map.values()];
  }

  types(): string[] {
    return [...this.map.keys()];
  }

  register(definition: CoreBlockDefinition): BlockRegistry {
    if (this.map.has(definition.type)) {
      throw new Error(`Block type "${definition.type}" is already registered.`);
    }
    if (!Number.isInteger(definition.version) || definition.version < 1) {
      throw new Error(`Block "${definition.type}" must have a positive integer version.`);
    }
    const next = new Map(this.map);
    next.set(definition.type, definition);
    return new BlockRegistryImpl(next);
  }
}

/** Create a registry, optionally seeded with an initial set of definitions. */
export function createBlockRegistry(definitions: CoreBlockDefinition[] = []): BlockRegistry {
  let registry: BlockRegistry = new BlockRegistryImpl(new Map());
  for (const def of definitions) registry = registry.register(def);
  return registry;
}

/* ---------------------------- validation helpers -------------------------- */

export function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

export function fail<T>(issues: DocumentIssue[]): ValidationResult<T> {
  return { ok: false, issues };
}

export function issue(path: string, code: string, message: string): DocumentIssue {
  return { path, code, message };
}
