import * as Y from "yjs";
import type {
  DisNoteBlock,
  DisNoteDocument,
  DisNoteInline,
  JsonValue,
} from "@disnote/document-core";

const BLOCKS_KEY = "blocks";

/** Seed a Y.Doc using nested Y types so block, prop and text edits merge independently. */
export function seedYDoc(ydoc: Y.Doc, document: DisNoteDocument): void {
  const blocks = ydoc.getArray<Y.Map<unknown>>(BLOCKS_KEY);
  ydoc.transact(() => {
    blocks.delete(0, blocks.length);
    blocks.insert(0, document.blocks.map(blockToYMap));
  });
}

function blockToYMap(block: DisNoteBlock): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  map.set("id", block.id);
  map.set("type", block.type);
  map.set("version", block.version);
  map.set("props", jsonObjectToYMap(block.props));
  if (block.content) map.set("content", inlineToYArray(block.content));
  if (block.children) {
    const children = new Y.Array<Y.Map<unknown>>();
    children.insert(0, block.children.map(blockToYMap));
    map.set("children", children);
  }
  return map;
}

function inlineToYArray(content: DisNoteInline[]): Y.Array<Y.Map<unknown>> {
  const array = new Y.Array<Y.Map<unknown>>();
  array.insert(0, content.map((node) => {
    const map = new Y.Map<unknown>();
    for (const [key, value] of Object.entries(node)) {
      if (key === "text" && typeof value === "string") {
        map.set(key, new Y.Text(value));
      } else {
        map.set(key, jsonToYValue(value as JsonValue));
      }
    }
    return map;
  }));
  return array;
}

function jsonObjectToYMap(value: Record<string, JsonValue>): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  for (const [key, item] of Object.entries(value)) map.set(key, jsonToYValue(item));
  return map;
}

function jsonToYValue(value: JsonValue): unknown {
  if (Array.isArray(value)) {
    const array = new Y.Array<unknown>();
    array.insert(0, value.map(jsonToYValue));
    return array;
  }
  if (typeof value === "object" && value !== null) return jsonObjectToYMap(value);
  return value;
}

/** Materialize a stable DisNoteDocument snapshot from the current CRDT state. */
export function snapshotFromYDoc(
  ydoc: Y.Doc,
  envelope: Omit<DisNoteDocument, "blocks">,
): DisNoteDocument {
  const blocks = ydoc.getArray<Y.Map<unknown>>(BLOCKS_KEY);
  return { ...envelope, blocks: blocks.toArray().map(yMapToBlock) };
}

function yMapToBlock(map: Y.Map<unknown>): DisNoteBlock {
  const block: DisNoteBlock = {
    id: String(map.get("id")),
    type: String(map.get("type")),
    version: Number(map.get("version")),
    props: yMapToJsonObject(map.get("props")),
  };
  const content = map.get("content");
  if (content instanceof Y.Array) {
    block.content = content.toArray().map((item) => yMapToJsonObject(item) as unknown as DisNoteInline);
  }
  const children = map.get("children");
  if (children instanceof Y.Array) {
    block.children = children.toArray().map((item) => yMapToBlock(item as Y.Map<unknown>));
  }
  return block;
}

function yMapToJsonObject(value: unknown): Record<string, JsonValue> {
  if (!(value instanceof Y.Map)) return {};
  const result: Record<string, JsonValue> = {};
  for (const [key, item] of value.entries()) result[key] = yValueToJson(item);
  return result;
}

function yValueToJson(value: unknown): JsonValue {
  if (value instanceof Y.Text) return value.toString();
  if (value instanceof Y.Array) return value.toArray().map(yValueToJson);
  if (value instanceof Y.Map) return yMapToJsonObject(value);
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  throw new Error("Yjs document contains a value outside the DisNote JSON contract.");
}

export function encodeState(ydoc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc);
}

export function applyUpdate(ydoc: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(ydoc, update);
}
