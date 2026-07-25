/**
 * JSON-safe value types. A persisted DisNote document may only contain these.
 * No functions, class instances, Date objects, Map/Set, React elements, DOM
 * nodes, Blobs or editor instances. Dates are stored as ISO-8601 strings.
 */
export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

/** True when the value contains only JSON-safe data. */
export function isJsonValue(value: unknown): value is JsonValue {
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
      return typeof value !== "number" || Number.isFinite(value);
    case "object":
      if (value === null) return true;
      if (Array.isArray(value)) return value.every(isJsonValue);
      if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
        return false; // reject class instances, Date, Map, Set, etc.
      }
      return Object.values(value as Record<string, unknown>).every(isJsonValue);
    default:
      return false;
  }
}
