import type { JsonValue } from "../model/json.js";
import type { DisNoteDocument } from "../model/document.js";
import { sha256Hex } from "./sha256.js";

/**
 * Deterministic JSON serialization: object keys sorted lexicographically at
 * every level, arrays preserved in order. Two semantically-equal documents
 * always produce the same string (and therefore the same checksum).
 */
export function canonicalJson(value: JsonValue): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const out: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortValue(value[key] as JsonValue);
    }
    return out;
  }
  return value;
}

/** SHA-256 (hex) of the canonical serialization of a document. */
export function checksum(document: DisNoteDocument): string {
  return sha256Hex(canonicalJson(document as unknown as JsonValue));
}
