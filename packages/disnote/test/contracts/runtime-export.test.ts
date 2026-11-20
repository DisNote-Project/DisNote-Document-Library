import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const canonical = join(repository, "contracts/go/v1");
const runtimes = [
  resolve(repository, "../DisNote-Go-SDK/testdata/contracts/v1"),
  join(repository, "sdks/flutter/test/fixtures/contracts/v1"),
];
const manifest = JSON.parse(readFileSync(join(canonical, "manifest.json"), "utf8")) as {
  validFixtures: string[];
  invalidFixtures: string[];
};

test("Go and Flutter consume byte-identical versioned contract fixtures", () => {
  const files = ["manifest.json", ...manifest.validFixtures, ...manifest.invalidFixtures];
  for (const runtime of runtimes) {
    for (const file of files) {
      assert.deepEqual(readFileSync(join(runtime, file)), readFileSync(join(canonical, file)));
    }
  }
});
