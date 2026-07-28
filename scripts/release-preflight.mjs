import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";
import { URL } from "node:url";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const manifest = JSON.parse(
  readFileSync(new URL("../packages/disnote/package.json", import.meta.url), "utf8"),
);
const errors = [];

function run(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
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

const whoami = run(npmCommand, ["whoami", "--registry", manifest.publishConfig.registry]);
if (whoami.status !== 0) {
  errors.push("npm is not authenticated. Run `npm login` and try again.");
}

const versionsResult = run(npmCommand, [
  "view",
  manifest.name,
  "versions",
  "--json",
  "--registry",
  manifest.publishConfig.registry,
]);
if (versionsResult.status !== 0) {
  errors.push(
    `Could not read published versions for ${manifest.name}: ${commandError(versionsResult)}`,
  );
} else {
  const publishedVersions = JSON.parse(versionsResult.stdout);
  if (publishedVersions.includes(manifest.version)) {
    errors.push(
      `${manifest.name}@${manifest.version} already exists on npm. Run \`npm run version-packages\` first.`,
    );
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`release preflight: ${error}`);
  process.exit(1);
}

console.log(
  `release preflight: ready to publish ${manifest.name}@${manifest.version} as ${whoami.stdout.trim()}`,
);
