import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocument } from "../../src/core/index.js";
import { DatabaseService } from "../../src/database/index.js";
import { WorkspaceDocumentService } from "../../src/workspace/index.js";
import { DocumentButtonActionService, type ButtonActionState, type DocumentButtonAction } from "../../src/actions/index.js";
function setup() {
  let state: ButtonActionState = { id: "workspace", revision: 1, workspace: { id: "workspace", revision: 1, pages: [], sharedBlocks: [] }, databases: [{ id: "db", title: "Tasks", revision: 1, properties: [{ id: "title", name: "Title", type: "text" }], records: [] }], receipts: {} };
  const service = new DocumentButtonActionService({ async read() { return structuredClone(state); }, async write(next, expected) { if (state.revision !== expected) return false; state = structuredClone(next); return true; } }, {
    workspace: repository => new WorkspaceDocumentService(repository, { async assert() {}, async can(_actor, _workspace, id) { return id !== "denied"; } }),
    database: repository => new DatabaseService(repository, { async assert() {}, async canReadRecord() { return true; }, async canWriteRecord() { return true; } }),
  }, { async assert(actor) { if (actor === "denied") throw new Error("denied"); } });
  return { service, read: () => structuredClone(state) };
}
test("multi-step buttons commit page creation and record updates atomically and deduplicate retries", async () => {
  const { service, read } = setup();
  const actions: DocumentButtonAction[] = [{ kind: "workspace", action: { kind: "createPage", page: { id: "page", parentId: null, revision: 1, trashed: false, document: createDocument({ id: "page", blocks: [] }) } } }, { kind: "upsertRecord", databaseId: "db", record: { id: "record", pageId: "page", values: { title: "Task" } } }];
  const first = await service.execute("actor", "workspace", 1, "token", actions);
  assert.deepEqual(first, { revision: 2, changedDatabases: ["db"] });
  assert.equal(read().workspace.pages.length, 1); assert.equal(read().databases[0]?.records.length, 1);
  assert.deepEqual(await service.execute("actor", "workspace", 1, "token", actions), first);
  assert.equal(read().revision, 2);
  await assert.rejects(service.execute("actor", "workspace", 2, "token", [{ kind: "deleteRecord", databaseId: "db", recordId: "record" }]), /invalid-document-actions/);
});
test("a denied final step rolls back earlier database changes", async () => {
  const { service, read } = setup();
  await assert.rejects(service.execute("actor", "workspace", 1, "token", [{ kind: "upsertRecord", databaseId: "db", record: { id: "record", values: { title: "Uncommitted" } } }, { kind: "workspace", action: { kind: "createPage", page: { id: "denied", parentId: null, revision: 1, trashed: false, document: createDocument({ id: "denied", blocks: [] }) } } }]), /access-denied/);
  assert.equal(read().revision, 1); assert.equal(read().databases[0]?.records.length, 0); assert.equal(Object.keys(read().receipts).length, 0);
});
