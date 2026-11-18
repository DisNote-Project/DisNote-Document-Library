import { cp, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const source = resolve(repositoryRoot, "contracts", "go", "v1");
const destination = resolve(process.argv[2] ?? resolve(repositoryRoot, "..", "DisNote-Go-SDK", "testdata", "contracts", "v1"));
const manifest = JSON.parse(await readFile(resolve(source, "manifest.json"), "utf8"));

if (manifest.contractVersion !== 1 || manifest.documentSchemaVersion !== 1) {
  throw new Error("Unsupported Go contract manifest version.");
}
if (!/^[0-9a-f]{64}$/.test(manifest.canonicalSha256)) {
  throw new Error("Go contract manifest is missing a valid canonical checksum.");
}

await mkdir(destination, { recursive: true });
for (const name of ["manifest.json", ...manifest.validFixtures, ...manifest.invalidFixtures]) {
  await cp(resolve(source, name), resolve(destination, name));
}

console.log(`Exported DisNote Go contract v${manifest.contractVersion} to ${destination}`);
