import type { BlockRegistry, CoreBlockDefinition } from "./registry/index.js";
import { createDefaultRegistry } from "./registry/core-blocks.js";

export interface DocumentPreset {
  /** Stable host-defined identifier. Custom presets are first-class. */
  id: string;
  registry: BlockRegistry;
  maxDepth: number;
  allowedExternalHosts: string[];
  capabilities: {
    comments: boolean;
    collaboration: boolean;
    publishing: boolean;
  };
}

export interface DefineDocumentPresetInput {
  id: string;
  base?: DocumentPreset;
  blocks?: readonly CoreBlockDefinition[];
  maxDepth?: number;
  allowedExternalHosts?: readonly string[];
  capabilities?: Partial<DocumentPreset["capabilities"]>;
}

export const DOCUMENT_PRESET_ERRORS = {
  ID_REQUIRED: "document-preset-id-required",
  MAX_DEPTH_INVALID: "document-preset-max-depth-invalid",
} as const;

/**
 * Compose an immutable preset without changing the core registry. Hosts can
 * add domain blocks and policies while retaining upgrade-safe defaults.
 */
export function defineDocumentPreset(input: DefineDocumentPresetInput): DocumentPreset {
  if (!input.id.trim()) throw new Error(DOCUMENT_PRESET_ERRORS.ID_REQUIRED);
  const base = input.base;
  let registry = base?.registry ?? createDefaultRegistry();
  for (const block of input.blocks ?? []) registry = registry.register(block);
  const maxDepth = input.maxDepth ?? base?.maxDepth ?? 10;
  if (!Number.isInteger(maxDepth) || maxDepth < 1) {
    throw new Error(DOCUMENT_PRESET_ERRORS.MAX_DEPTH_INVALID);
  }
  return {
    id: input.id,
    registry,
    maxDepth,
    allowedExternalHosts: [...(input.allowedExternalHosts ?? base?.allowedExternalHosts ?? [])],
    capabilities: {
      comments: input.capabilities?.comments ?? base?.capabilities.comments ?? false,
      collaboration: input.capabilities?.collaboration ?? base?.capabilities.collaboration ?? false,
      publishing: input.capabilities?.publishing ?? base?.capabilities.publishing ?? false,
    },
  };
}

const sharedRegistry = createDefaultRegistry();

/** Registry shared by the V1 presets (all V1 core blocks). */
export const articleRegistry: BlockRegistry = sharedRegistry;
export const legalRegistry: BlockRegistry = sharedRegistry;
export const workspaceRegistry: BlockRegistry = sharedRegistry;

export const articlePreset: DocumentPreset = {
  id: "article",
  registry: articleRegistry,
  maxDepth: 4,
  allowedExternalHosts: [],
  capabilities: { comments: false, collaboration: false, publishing: true },
};

export const legalPreset: DocumentPreset = {
  id: "legal",
  registry: legalRegistry,
  maxDepth: 3,
  allowedExternalHosts: [],
  capabilities: { comments: false, collaboration: false, publishing: true },
};

export const workspacePreset: DocumentPreset = {
  id: "workspace",
  registry: workspaceRegistry,
  maxDepth: 10,
  allowedExternalHosts: [],
  capabilities: { comments: true, collaboration: true, publishing: false },
};

export const presets = {
  article: articlePreset,
  legal: legalPreset,
  workspace: workspacePreset,
} as const;
