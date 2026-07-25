import type { BlockRegistry } from "./registry/index.js";
import { createDefaultRegistry } from "./registry/core-blocks.js";

export interface DocumentPreset {
  id: "article" | "legal" | "workspace";
  registry: BlockRegistry;
  maxDepth: number;
  allowedExternalHosts: string[];
  capabilities: {
    comments: boolean;
    collaboration: boolean;
    publishing: boolean;
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
