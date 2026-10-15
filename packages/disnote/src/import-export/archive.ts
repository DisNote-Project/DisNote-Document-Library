import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { createDocument, createId, image, type DisNoteBlock, type DisNoteInline } from "../core/index.js";
import { detectMimeType } from "../assets/index.js";
import type { DatabaseSnapshot } from "../database/index.js";
import { BUNDLE_CONSTANTS, importDocumentBundle, type DocumentBundle } from "./bundle.js";
import { importMarkdown } from "./markdown/import.js";
import { importHtml } from "./html/import.js";
import type { InteropWarning } from "./warnings.js";
const ARCHIVE = { MANIFEST: "manifest.json", MAX_BYTES: 100_000_000, MAX_FILES: 10000, INVALID: "invalid-document-archive", MIME: "application/octet-stream" } as const;
export function readDocumentArchive(bytes: Uint8Array): Record<string, Uint8Array> {
  if (bytes.byteLength > ARCHIVE.MAX_BYTES) throw new Error(ARCHIVE.INVALID);
  let total = 0, count = 0; const seen = new Set<string>();
  return unzipSync(bytes, { filter: info => {
    if (!safePath(info.name) || seen.has(info.name) || ++count > ARCHIVE.MAX_FILES || (total += info.originalSize) > ARCHIVE.MAX_BYTES) throw new Error(ARCHIVE.INVALID);
    seen.add(info.name); return !info.name.endsWith("/");
  } });
}
function safePath(path: string): boolean { return !!path && !path.startsWith("/") && !path.includes("\\") && !path.includes("\0") && !path.split("/").some(segment => segment === ".." || segment.includes(":")); }
export function exportDocumentArchive(input: DocumentBundle): Uint8Array {
  const bundle = importDocumentBundle(input), files: Record<string, Uint8Array> = Object.create(null);
  const pages = bundle.pages.map(page => { const file = `pages/${encodeURIComponent(page.document.id)}.json`; files[file] = strToU8(JSON.stringify(page.document)); return { parentId: page.parentId, file }; });
  const assets = bundle.assets.map(asset => { const file = `assets/${encodeURIComponent(asset.id)}`; files[file] = new Uint8Array(asset.bytes); return { id: asset.id, name: asset.name, mime: asset.mime, file }; });
  files[ARCHIVE.MANIFEST] = strToU8(JSON.stringify({ format: BUNDLE_CONSTANTS.FORMAT, version: BUNDLE_CONSTANTS.VERSION, pages, assets, databases: bundle.databases, sharedBlocks: bundle.sharedBlocks }));
  return zipSync(files);
}
export function importDocumentArchive(bytes: Uint8Array): DocumentBundle {
  const files = readDocumentArchive(bytes), manifestBytes = files[ARCHIVE.MANIFEST];
  if (!manifestBytes) throw new Error(ARCHIVE.INVALID);
  const manifest = JSON.parse(strFromU8(manifestBytes)) as { format: string; version: number; databases?: DatabaseSnapshot[]; sharedBlocks?: DocumentBundle["sharedBlocks"]; pages: { parentId: string | null; file: string }[]; assets: { id: string; name: string; mime: string; file: string }[] };
  if (!Array.isArray(manifest.pages) || !Array.isArray(manifest.assets)) throw new Error(ARCHIVE.INVALID);
  const get = (file: string) => { if (!safePath(file) || !files[file]) throw new Error(ARCHIVE.INVALID); return files[file]!; };
  return importDocumentBundle({ format: manifest.format, version: manifest.version, databases: manifest.databases, sharedBlocks: manifest.sharedBlocks, pages: manifest.pages.map(page => ({ parentId: page.parentId, document: JSON.parse(strFromU8(get(page.file))) })), assets: manifest.assets.map(asset => ({ id: asset.id, name: asset.name, mime: asset.mime, bytes: Array.from(get(asset.file)) })) });
}
export interface NotionExportImport { bundle: DocumentBundle; databases: DatabaseSnapshot[]; warnings: InteropWarning[] }
/** Notion Markdown/CSV or HTML ZIP exports. Lost database semantics are always reported. */
export function importNotionExport(bytes: Uint8Array): NotionExportImport {
  const files = readDocumentArchive(bytes), warnings: InteropWarning[] = [], ids = new Map<string, string>();
  const paths = Object.keys(files).filter(path => /\.(md|html?|csv)$/iu.test(path));
  for (const path of paths) ids.set(path, createId("page"));
  const bundle: DocumentBundle = { format: BUNDLE_CONSTANTS.FORMAT, version: BUNDLE_CONSTANTS.VERSION, pages: [], assets: [] }, databases: DatabaseSnapshot[] = [];
  const assets = new Map<string, string>();
  for (const [path, content] of Object.entries(files)) if (!paths.includes(path)) {
    const id = createId("asset"); assets.set(path, id);
    bundle.assets.push({ id, name: path.split("/").pop() ?? path, mime: detectMimeType(content) ?? ARCHIVE.MIME, bytes: Array.from(content) });
  }
  const resolve = (base: string, href: string): string | null => {
    try {
      const parts = base.split("/").slice(0, -1);
      for (const part of decodeURIComponent(href.split("#")[0]!).split("/")) {
        if (!part || part === ".") continue;
        if (part === "..") { if (!parts.length) return null; parts.pop(); } else parts.push(part);
      }
      const path = parts.join("/"); return safePath(path) ? path : null;
    } catch { return null; }
  };
  for (const path of paths) {
    const id = ids.get(path)!, content = strFromU8(files[path]!), filename = path.split("/").pop()!, title = filename.replace(/\.[^.]+$/u, "").replace(/ [a-f0-9]{32}$/iu, "");
    const directory = path.split("/").slice(0, -1).join("/");
    const parentPath = [directory + ".md", directory + ".html", directory + ".csv"].find(candidate => ids.has(candidate));
    const parentId = parentPath ? ids.get(parentPath)! : null;
    if (/\.csv$/iu.test(path)) {
      const rows = parseCsv(content), headers = rows.shift() ?? [], propertyIds = headers.map(() => createId("property"));
      const database: DatabaseSnapshot = { id, title, revision: 1, properties: headers.map((name, index) => ({ id: propertyIds[index]!, name, type: "text" })), records: rows.filter(row => row.some(Boolean)).map(row => ({ id: createId("record"), values: Object.fromEntries(propertyIds.map((key, index) => [key, row[index] ?? ""])) })) };
      databases.push(database);
      bundle.pages.push({ parentId, document: createDocument({ id, metadata: { title }, blocks: [{ id: createId(), type: "tableDb", version: 1, props: { databaseId: id, title } }] }) });
      warnings.push({ code: "lossy-block", message: `CSV ${path}: property types, formulas, relations, rollups and view settings are not preserved by Notion CSV export; values were imported as text.` });
      continue;
    }
    const imported = /\.html?$/iu.test(path) ? importHtml(content) : importMarkdown(content);
    warnings.push(...imported.warnings);
    let blocks = imported.document.blocks;
    // Markdown image lines need explicit assets; the generic Markdown subset does not parse images.
    if (/\.md$/iu.test(path) && /^!\[[^\]]*\]\([^\n]+\)\s*$/mu.test(content)) {
      blocks = []; let chunk: string[] = [];
      const flush = () => { if (chunk.length) { const result = importMarkdown(chunk.join("\n")); blocks.push(...result.document.blocks); warnings.push(...result.warnings); chunk = []; } };
      for (const line of content.split(/\r?\n/u)) {
        const match = /^!\[([^\]]*)\]\((.+)\)\s*$/u.exec(line);
        const assetPath = match ? resolve(path, match[2]!) : null, assetId = assetPath ? assets.get(assetPath) : undefined;
        if (match && assetId) { flush(); blocks.push(image(assetId, match[1]!)); } else chunk.push(line);
      }
      flush();
    }
    const rewrite = (nodes: DisNoteInline[]): DisNoteInline[] => nodes.map(node => {
      if (node.type !== "link") return node;
      const target = resolve(path, node.href), targetId = target ? ids.get(target) : undefined;
      return targetId ? { type: "reference", targetType: "document", targetId, label: node.content.map(t => t.text).join("") } : node;
    });
    const rewriteBlocks = (items: DisNoteBlock[]): DisNoteBlock[] => items.map(block => ({ ...block, ...(block.content ? { content: rewrite(block.content) } : {}), ...(block.children ? { children: rewriteBlocks(block.children) } : {}) }));
    bundle.pages.push({ parentId, document: { ...imported.document, id, metadata: { ...imported.document.metadata, title }, blocks: rewriteBlocks(blocks) } });
  }
  bundle.databases = databases;
  importDocumentBundle(bundle);
  return { bundle, databases, warnings };
}
export function parseCsv(input: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index]!;
    if (char === '"') { if (quoted && input[index + 1] === '"') { field += '"'; index++; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && input[index + 1] === "\n") index++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (quoted) throw new Error(ARCHIVE.INVALID);
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
