import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { createDocument, paragraph, text } from "../../src/core/index.js";
import { exportDocumentArchive, importDocumentArchive, importNotionExport, parseCsv, readDocumentArchive } from "../../src/import-export/index.js";

test("ZIP roundtrip keeps document tree, database records, shared sources and binary assets", () => {
  const document = createDocument({ id: "page", blocks: [paragraph([text("Content")])] });
  const bundle = { format: "disnote-workspace" as const, version: 1 as const, pages: [{ parentId: null, document }], assets: [{ id: "asset", name: "photo.png", mime: "image/png", bytes: [137, 80, 78, 71] }], databases: [{ id: "db", title: "Data", revision: 1, properties: [{ id: "text", name: "Text", type: "text" as const }], records: [{ id: "row", values: { text: "Value" } }] }], sharedBlocks: [{ id: "source", ownerPageId: "page", revision: 1, blocks: document.blocks }] };
  assert.deepEqual(importDocumentArchive(exportDocumentArchive(bundle)), bundle);
});

test("Notion Markdown/CSV ZIP preserves hierarchy, references, images and quoted CSV values", () => {
  const archive = zipSync({
    "Parent.md": strToU8("# Parent\n\n[Child](Parent/Child.md)"),
    "Parent/Child.md": strToU8("# Child\n\n![Photo](photo.png)"),
    "Parent/photo.png": new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    "Tasks.csv": strToU8('Name,Description\r\nTask,"Line 1\nLine 2, with comma"\r\n'),
  });
  const imported = importNotionExport(archive);
  const parent = imported.bundle.pages.find(p => p.document.metadata.title === "Parent")!, child = imported.bundle.pages.find(p => p.document.metadata.title === "Child")!;
  assert.equal(child.parentId, parent.document.id);
  assert.equal(parent.document.blocks[1]?.content?.[0]?.type, "reference");
  assert.equal(child.document.blocks[1]?.type, "image");
  assert.equal(child.document.blocks[1]?.props["assetId"], imported.bundle.assets[0]?.id);
  assert.equal(imported.databases[0]?.records.length, 1);
  assert.ok(Object.values(imported.databases[0]!.records[0]!.values).includes("Line 1\nLine 2, with comma"));
  assert.ok(imported.warnings.some(warning => warning.message.includes("property types")));
  assert.equal(imported.bundle.databases?.length, 1);
});

test("ZIP path traversal, excessive expansion and malformed CSV fail before import", () => {
  assert.throws(() => readDocumentArchive(zipSync({ "../escape.md": strToU8("Bad") })), /invalid-document-archive/);
  assert.throws(() => parseCsv('Title\n"unterminated'), /invalid-document-archive/);
  const archive = zipSync({ "huge.txt": new Uint8Array(1024) });
  // Forge the central directory declared size so the filter rejects before decompression.
  const central = archive.findIndex((value, index) => value === 0x50 && archive[index + 1] === 0x4b && archive[index + 2] === 0x01 && archive[index + 3] === 0x02);
  new DataView(archive.buffer).setUint32(central + 24, 100_000_001, true);
  assert.throws(() => readDocumentArchive(archive), /invalid-document-archive/);
});
