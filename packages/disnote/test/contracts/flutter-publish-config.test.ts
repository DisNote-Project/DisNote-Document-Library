import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const packageRoot = join(repository, "sdks/flutter");

const read = (relativePath: string): string =>
  readFileSync(join(packageRoot, relativePath), "utf8");

test("Flutter package carries the required pub.dev release metadata", () => {
  for (const file of ["README.md", "CHANGELOG.md", "LICENSE", "pubspec.yaml", ".pubignore"]) {
    assert.equal(existsSync(join(packageRoot, file)), true, `${file} must exist`);
  }

  const pubspec = read("pubspec.yaml");
  assert.match(pubspec, /^name: disnote_flutter$/m);
  const version = pubspec.match(/^version: (\d+\.\d+\.\d+)$/m)?.[1];
  assert.ok(version, "pubspec version must be stable semantic versioning");
  assert.match(pubspec, /^documentation: "https:\/\//m);
  assert.match(pubspec, /^homepage: https:\/\//m);
  assert.match(pubspec, /^repository: https:\/\//m);
  assert.match(pubspec, /^issue_tracker: https:\/\//m);
  assert.match(pubspec, /^platforms:\n {2}android:\n {2}ios:\n {2}web:$/m);
  assert.match(pubspec, /^ {2}flutter: ">=3\.50\.0"$/m);
  assert.match(pubspec, /^ {2}material_ui: \^1\.11\.1$/m);
  assert.doesNotMatch(pubspec, /^publish_to:\s*none$/m);
  assert.doesNotMatch(pubspec, /^license:/m);

  const changelog = read("CHANGELOG.md");
  assert.equal(changelog.startsWith(`# ${version}\n`), true);

  const pubignore = read(".pubignore");
  for (const excluded of ["build/", "coverage/", "test/", "pubspec.lock"]) {
    assert.match(pubignore, new RegExp(`^${excluded.replace(".", "\\.")}$`, "m"));
  }

  for (const source of [
    "lib/src/document_editor.dart",
    "lib/src/document_renderer.dart",
    "test/renderer_test.dart",
    "example/lib/main.dart",
  ]) {
    assert.doesNotMatch(read(source), /package:flutter\/material\.dart/);
  }
});

test("Flutter publication workflow is isolated, gated and OIDC-based", () => {
  const workflow = readFileSync(
    join(repository, ".github/workflows/publish-flutter.yml"),
    "utf8",
  );

  assert.match(workflow, /disnote_flutter-v\[0-9\]\+\.\[0-9\]\+\.\[0-9\]\+/);
  assert.match(workflow, /dart pub publish --dry-run/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /dart-lang\/setup-dart\/\.github\/workflows\/publish\.yml@v1/);
  assert.match(workflow, /working-directory: sdks\/flutter/);
  assert.match(workflow, /environment: pub\.dev/);
  assert.doesNotMatch(workflow, /PUB_TOKEN|PUB_CREDENTIALS|secrets\./);
});
