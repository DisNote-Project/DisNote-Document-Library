import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import process from "node:process";
import { URL } from "node:url";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const defaultRegistry = "https://registry.npmjs.org/";
const packagesURL = new URL("../packages/", import.meta.url);
const manifests = readdirSync(packagesURL, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => JSON.parse(readFileSync(new URL(`${entry.name}/package.json`, packagesURL), "utf8")))
  .filter((manifest) => !manifest.private);
const registryFor = (manifest) => manifest.publishConfig?.registry ?? defaultRegistry;
const errors = [];

function run(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  });
}

function commandError(result) {
  return (
    result.stderr?.trim() ||
    result.error?.message ||
    `command exited with status ${String(result.status)}`
  );
}

const gitStatus = execFileSync("git", ["status", "--porcelain"], {
  encoding: "utf8",
}).trim();
if (gitStatus.length > 0) {
  errors.push(
    "Git working tree is not clean. Commit the release changes before publishing.",
  );
}

const branch = execFileSync("git", ["branch", "--show-current"], {
  encoding: "utf8",
}).trim();
if (branch !== "main") {
  errors.push(`Release must run from the main branch, not "${branch}".`);
}

const fetchResult = run("git", ["fetch", "origin", "main", "--quiet"]);
if (fetchResult.status !== 0) {
  errors.push(`Could not refresh origin/main: ${commandError(fetchResult)}`);
} else {
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const remoteHead = execFileSync("git", ["rev-parse", "origin/main"], {
    encoding: "utf8",
  }).trim();
  if (head !== remoteHead) {
    errors.push(
      "Local main must exactly match origin/main. Pull or push your commits first.",
    );
  }
}

const registries = [...new Set(manifests.map(registryFor))];
const identities = new Map();
for (const registry of registries) {
  const whoami = run(npmCommand, ["whoami", "--registry", registry]);
  if (whoami.status !== 0) errors.push(`npm is not authenticated for ${registry}. Run npm login and try again.`);
  else identities.set(registry, whoami.stdout.trim());
}

for (const manifest of manifests) {
  const versionsResult = run(npmCommand, ["view", manifest.name, "versions", "--json", "--registry", registryFor(manifest)]);
  if (versionsResult.status !== 0) {
    if (!/\bE404\b/u.test(versionsResult.stderr ?? "")) errors.push(`Could not read published versions for ${manifest.name}: ${commandError(versionsResult)}`);
  } else {
    const value = JSON.parse(versionsResult.stdout);
    const publishedVersions = Array.isArray(value) ? value : [value];
    if (publishedVersions.includes(manifest.version)) errors.push(`${manifest.name}@${manifest.version} already exists on npm. Prepare and commit the next version first.`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`release preflight: ${error}`);
  process.exit(1);
}

console.log(`release preflight: ready to publish ${manifests.map((manifest) => `${manifest.name}@${manifest.version}`).join(", ")} as ${[...identities.values()].join(", ")}`);
