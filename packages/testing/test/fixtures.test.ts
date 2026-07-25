import { test } from "node:test";
import assert from "node:assert/strict";
import { createDefaultRegistry } from "../../document-core/src/index.js";
import { allFixtures, assertValidDocument } from "../src/index.js";

const registry = createDefaultRegistry();

test("every fixture is a valid document", () => {
  for (const doc of allFixtures()) {
    assert.doesNotThrow(() => assertValidDocument(doc, registry), `fixture ${doc.id} should be valid`);
  }
});
