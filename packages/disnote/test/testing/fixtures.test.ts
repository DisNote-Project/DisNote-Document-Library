import { test } from "node:test";
import assert from "node:assert/strict";
import { createDefaultRegistry } from "../../src/core/index.js";
import { allFixtures, assertValidDocument } from "../../src/testing/index.js";

const registry = createDefaultRegistry();

test("every fixture is a valid document", () => {
  for (const doc of allFixtures()) {
    assert.doesNotThrow(() => assertValidDocument(doc, registry), `fixture ${doc.id} should be valid`);
  }
});
