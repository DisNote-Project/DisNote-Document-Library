import { validateDocument, type BlockRegistry, type DisNoteDocument } from "../core/index.js";
import { validateDatabaseSnapshot, type DatabaseSnapshot } from "../database/index.js";
import type { SharedBlockSource } from "../workspace/model.js";
export const BUNDLE_CONSTANTS = { FORMAT: "disnote-workspace", VERSION: 1, MAX_DOCUMENTS: 1000, MAX_ASSET_BYTES: 50_000_000, INVALID: "invalid-workspace-bundle" } as const;
export interface DocumentBundle {
  databases?: DatabaseSnapshot[];
  sharedBlocks?: SharedBlockSource[];
  format: typeof BUNDLE_CONSTANTS.FORMAT;
  version: typeof BUNDLE_CONSTANTS.VERSION;
  pages: { parentId: string | null; document: DisNoteDocument }[];
  /** Byte arrays remain portable through JSON. Hosts can ZIP these as binary files. */
  assets: { id: string; name: string; mime: string; bytes: number[] }[];
}
export function exportDocumentBundle(pages: DocumentBundle["pages"], assets: DocumentBundle["assets"] = [], registry?: BlockRegistry): string {
  const bundle: DocumentBundle = { format: BUNDLE_CONSTANTS.FORMAT, version: BUNDLE_CONSTANTS.VERSION, pages, assets };
  importDocumentBundle(bundle, registry); return JSON.stringify(bundle);
}
export function importDocumentBundle(input: unknown, registry?: BlockRegistry): DocumentBundle {
  if (typeof input === "string" && input.length > 100_000_000) throw new Error(BUNDLE_CONSTANTS.INVALID);
  const value = typeof input === "string" ? JSON.parse(input) as unknown : input;
  if (!value || typeof value !== "object") throw new Error(BUNDLE_CONSTANTS.INVALID);
  const bundle = value as DocumentBundle;
  if (bundle.format !== BUNDLE_CONSTANTS.FORMAT || bundle.version !== BUNDLE_CONSTANTS.VERSION || !Array.isArray(bundle.pages) || bundle.pages.length > BUNDLE_CONSTANTS.MAX_DOCUMENTS || !Array.isArray(bundle.assets)) throw new Error(BUNDLE_CONSTANTS.INVALID);
  const ids = new Set<string>();
  for (const page of bundle.pages) {
    if (!page || !validateDocument(page.document, registry ? { registry, strictUnknownBlocks: true } : {}).ok || ids.has(page.document.id) || (page.parentId !== null && typeof page.parentId !== "string")) throw new Error(BUNDLE_CONSTANTS.INVALID);
    ids.add(page.document.id);
  }
  if (bundle.databases !== undefined) {
    if (!Array.isArray(bundle.databases) || bundle.databases.length > BUNDLE_CONSTANTS.MAX_DOCUMENTS) throw new Error(BUNDLE_CONSTANTS.INVALID);
    const databaseIds = new Set<string>(); let totalRecords = 0;
    for (const database of bundle.databases) { validateDatabaseSnapshot(database); if (databaseIds.has(database.id) || (totalRecords += database.records.length) > 100000) throw new Error(BUNDLE_CONSTANTS.INVALID); databaseIds.add(database.id); }
  }
  if (bundle.sharedBlocks !== undefined) {
    if (!Array.isArray(bundle.sharedBlocks) || bundle.sharedBlocks.length > 10000) throw new Error(BUNDLE_CONSTANTS.INVALID);
    const sourceIds = new Set<string>();
    for (const source of bundle.sharedBlocks) {
      const owner = bundle.pages.find(page => page.document.id === source.ownerPageId);
      if (!source.id || sourceIds.has(source.id) || !owner || !Number.isInteger(source.revision) || source.revision < 1 || !validateDocument({ ...owner.document, blocks: source.blocks }, registry ? { registry, strictUnknownBlocks: true } : {}).ok) throw new Error(BUNDLE_CONSTANTS.INVALID);
      sourceIds.add(source.id);
    }
  }
  const parents = new Map(bundle.pages.map(p => [p.document.id, p.parentId]));
  for (const page of bundle.pages) {
    const seen = new Set([page.document.id]); let cursor = page.parentId;
    while (cursor) { if (!ids.has(cursor) || seen.has(cursor)) throw new Error(BUNDLE_CONSTANTS.INVALID); seen.add(cursor); cursor = parents.get(cursor) ?? null; }
  }
  const assetIds = new Set<string>(); let bytes = 0;
  for (const asset of bundle.assets) {
    if (!asset || typeof asset.id !== "string" || !asset.id || assetIds.has(asset.id) || typeof asset.name !== "string" || typeof asset.mime !== "string" || !Array.isArray(asset.bytes) || asset.bytes.some(b => !Number.isInteger(b) || b < 0 || b > 255)) throw new Error(BUNDLE_CONSTANTS.INVALID);
    bytes += asset.bytes.length; if (bytes > BUNDLE_CONSTANTS.MAX_ASSET_BYTES) throw new Error(BUNDLE_CONSTANTS.INVALID); assetIds.add(asset.id);
  }
  return structuredClone(bundle);
}
