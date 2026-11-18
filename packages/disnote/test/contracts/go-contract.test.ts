import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson, checksum, validateDocument, type DisNoteDocument } from "../../src/core/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../../contracts/go/v1");
const readJson = (name: string): unknown => JSON.parse(readFileSync(join(root, name), "utf8"));

interface ContractManifest {
  contractVersion: number;
  documentSchemaVersion: number;
  canonicalFixture: string;
  canonicalSha256: string;
  validFixtures: string[];
  invalidFixtures: string[];
}

test("Go contract fixtures stay aligned with the TypeScript document core", () => {
  const manifest = readJson("manifest.json") as ContractManifest;
  assert.equal(manifest.contractVersion, 1);
  assert.equal(manifest.documentSchemaVersion, 1);

  for (const name of manifest.validFixtures) {
    const result = validateDocument(readJson(name));
    assert.equal(result.ok, true, `${name} must remain valid`);
  }
  for (const name of manifest.invalidFixtures) {
    const result = validateDocument(readJson(name));
    assert.equal(result.ok, false, `${name} must remain invalid`);
  }

  const canonical = readJson(manifest.canonicalFixture) as DisNoteDocument;
  assert.equal(checksum(canonical), manifest.canonicalSha256);
  assert.equal(canonicalJson(canonical as never), canonicalJson(JSON.parse(JSON.stringify(canonical))));
});
