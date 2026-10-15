import { createDocument, createId, text, safeUrl, type DisNoteBlock, type DisNoteInline } from "../core/index.js";
import type { ImportResult, InteropWarning } from "./warnings.js";
const NOTION_IMPORT = { INVALID: "invalid-notion-blocks", MAX_BLOCKS: 10000, MAX_DEPTH: 32 } as const;
type JsonObject = Record<string, unknown>;
function object(value: unknown): JsonObject { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {}; }
const BLOCK_TYPES: Record<string, string> = {
  paragraph: "paragraph", heading_1: "heading", heading_2: "heading", heading_3: "heading", bulleted_list_item: "bulletListItem", numbered_list_item: "numberedListItem", to_do: "checklistItem", toggle: "toggle", quote: "quote", callout: "callout", divider: "divider", code: "codeBlock", equation: "math", image: "image", video: "video", audio: "audio", file: "file", bookmark: "bookmark", table_of_contents: "tableOfContents", breadcrumb: "breadcrumb", column_list: "columnList", column: "column", synced_block: "syncedBlock",
};
/** Import expanded Notion API blocks; has_children without children emits an explicit loss warning. */
export function importNotionBlocks(input: unknown, metadata: { id?: string; title?: string } = {}): ImportResult {
  if (!Array.isArray(input)) throw new Error(NOTION_IMPORT.INVALID);
  const warnings: InteropWarning[] = []; let count = 0;
  const warn = (id: string, code: InteropWarning["code"], message: string) => warnings.push({ blockId: id, code, message });
  const richText = (items: unknown, id: string): DisNoteInline[] => {
    if (!Array.isArray(items)) return [];
    return items.map(item => {
      const node = object(item), body = object(node["text"]), annotation = object(node["annotations"]);
      const plain = typeof node["plain_text"] === "string" ? node["plain_text"] : typeof body["content"] === "string" ? body["content"] : "";
      const marks: NonNullable<ReturnType<typeof text>["marks"]> = [];
      for (const [key, type] of [["bold", "bold"], ["italic", "italic"], ["underline", "underline"], ["strikethrough", "strike"], ["code", "code"]] as const) if (annotation[key]) marks.push({ type });
      if (annotation["color"] && annotation["color"] !== "default") warn(id, "lossy-mark", "Notion named color requires a theme mapping.");
      const inline = text(plain, marks), href = object(body["link"])["url"] ?? node["href"];
      if (typeof href === "string") {
        const safe = safeUrl(href, { allowedSchemes: ["https:", "http:", "mailto:", "tel:"] });
        if (safe) return { type: "link" as const, href: safe, content: [inline] };
        warn(id, "unsafe-url", "Unsafe Notion link was removed.");
      }
      if (node["type"] === "mention") {
        const mention = object(node["mention"]), page = object(mention["page"]), user = object(mention["user"]);
        if (typeof page["id"] === "string") return { type: "reference" as const, targetType: "document" as const, targetId: page["id"], label: plain };
        if (typeof user["id"] === "string") return { type: "mention" as const, entityType: "user" as const, entityId: user["id"], label: plain };
        warn(id, "lossy-inline", "Notion mention was preserved as text.");
      }
      return inline;
    });
  };
  const convert = (items: unknown[], depth: number): DisNoteBlock[] => {
    if (depth > NOTION_IMPORT.MAX_DEPTH) throw new Error(NOTION_IMPORT.INVALID);
    return items.map(item => {
      if (++count > NOTION_IMPORT.MAX_BLOCKS) throw new Error(NOTION_IMPORT.INVALID);
      const node = object(item), type = String(node["type"] ?? ""), data = object(node[type]), id = typeof node["id"] === "string" ? node["id"] : createId();
      const block: DisNoteBlock = { id, type: BLOCK_TYPES[type] ?? "paragraph", version: 1, props: {} };
      if (!BLOCK_TYPES[type]) { warn(id, "lossy-block", `Unsupported Notion block: ${type}`); block.content = [text(JSON.stringify(data))]; return block; }
      if (["paragraph", "heading", "bulletListItem", "numberedListItem", "checklistItem", "toggle", "quote", "callout"].includes(block.type)) block.content = richText(data["rich_text"], id);
      if (block.type === "heading") block.props["level"] = Number(type.slice(-1));
      if (block.type === "checklistItem") block.props["checked"] = data["checked"] === true;
      if (block.type === "callout") block.props["intent"] = "info";
      if (block.type === "codeBlock") { block.props["language"] = String(data["language"] ?? "text"); block.props["code"] = richText(data["rich_text"], id).map(n => n.type === "text" ? n.text : n.type === "link" ? n.content.map(t => t.text).join("") : n.label).join(""); }
      if (block.type === "math") block.props["code"] = String(data["expression"] ?? "");
      if (["image", "video", "audio", "file", "bookmark"].includes(block.type)) {
        const url = data["url"] ?? object(data[String(data["type"])])["url"];
        const safe = typeof url === "string" ? safeUrl(url, { allowedSchemes: ["https:", "http:"] }) : null;
        block.props["url"] = safe ?? "";
        if (block.type === "image") { block.props["assetId"] = id; block.props["alt"] = ""; }
        if (!safe) warn(id, "unsafe-url", "Missing or unsafe Notion media URL.");
        if (data["type"] === "file") warn(id, "lossy-block", "Notion hosted file URLs expire; copy the asset into your own storage.");
      }
      if (block.type === "syncedBlock") { block.props["syncedBlockId"] = String(object(data["synced_from"])["block_id"] ?? ""); if (block.props["syncedBlockId"]) warn(id, "lossy-block", "Register the referenced synced source before resolving this block."); }
      const children = node["children"] ?? data["children"];
      if (Array.isArray(children)) block.children = convert(children, depth + 1);
      else if (node["has_children"]) warn(id, "lossy-block", "Notion children were not supplied; fetch the complete child list before importing.");
      return block;
    });
  };
  const blocks = convert(input, 0);
  if (new Set(blockIds(blocks)).size !== count) throw new Error(NOTION_IMPORT.INVALID);
  return { document: createDocument({ ...(metadata.id ? { id: metadata.id } : {}), metadata: { title: metadata.title ?? "" }, blocks }), warnings };
}
function blockIds(blocks: DisNoteBlock[]): string[] { return blocks.flatMap(b => [b.id, ...blockIds(b.children ?? [])]); }
