import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalJson } from "../../src/core/index.js";
test("canonical serialization preserves prototype-looking JSON keys without changing object prototypes", () => {
  const input = JSON.parse('{"value":2,"__proto__":{"x":1}}');
  assert.equal(canonicalJson(input), '{"__proto__":{"x":1},"value":2}');
  assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "x"), false);
  assert.notEqual(canonicalJson(input), canonicalJson({ value: 2 }));
});
