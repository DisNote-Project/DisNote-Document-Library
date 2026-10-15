import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocument, paragraph, reference, text } from "../../src/core/index.js";
import { WorkspaceDocumentService, InMemoryWorkspaceRepository, instantiateTemplate, type WorkspacePage } from "../../src/workspace/index.js";

function page(id: string, parentId: string | null = null): WorkspacePage {
  return { id, parentId, document: createDocument({ id, metadata: { title: id }, blocks: [paragraph([text(id)])] }), trashed: false, revision: 1 };
}
function setup() {
  const repository = new InMemoryWorkspaceRepository();
  const service = new WorkspaceDocumentService(repository, { async assert() {}, async can(actor, _workspace, pageId) { return actor === "admin" || pageId !== "secret"; } });
  return { service, repository };
}
test("page hierarchy rejects cycles atomically and supports trash/restore", async () => {
  const { service, repository } = setup();
  await service.create("admin", "ws");
  await service.execute("admin", "ws", 1, [{ kind: "createPage", page: page("root") }, { kind: "createPage", page: page("child", "root") }]);
  assert.deepEqual((await service.breadcrumbs("admin", "ws", "child")).map(p => p.id), ["root", "child"]);
  await assert.rejects(service.execute("admin", "ws", 2, [{ kind: "movePage", pageId: "root", parentId: "child" }]), /cycle/);
  assert.equal((await repository.read("ws"))?.revision, 2);
  await service.execute("admin", "ws", 2, [{ kind: "trashPage", pageId: "root" }]);
  assert.equal((await service.pages("admin", "ws")).length, 0);
  assert.equal((await service.pages("admin", "ws", true)).length, 2);
  await service.execute("admin", "ws", 3, [{ kind: "restorePage", pageId: "root" }]);
  assert.equal((await service.pages("admin", "ws")).length, 2);
});

test("backlinks respect visibility and button actions roll back together", async () => {
  const { service, repository } = setup();
  await service.create("admin", "ws");
  const linked = page("linked"), hidden = page("secret");
  linked.document.blocks = [paragraph([reference("document", "target", "Target")])];
  hidden.document.blocks = linked.document.blocks;
  await service.execute("admin", "ws", 1, [page("target"), linked, hidden].map(p => ({ kind: "createPage", page: p })));
  assert.deepEqual((await service.backlinks("member", "ws", "target")).map(p => p.id), ["linked"]);
  await assert.rejects(service.execute("member", "ws", 2, [{ kind: "createPage", page: page("new") }, { kind: "trashPage", pageId: "secret" }]), /denied/);
  assert.equal((await repository.read("ws"))?.pages.some(p => p.id === "new"), false);
});

test("shared sources update all occurrences, namespace IDs and reject denied reads", async () => {
  const { service } = setup();
  await service.create("admin", "ws");
  const consumer = page("consumer");
  consumer.document.blocks = ["first", "second"].map(id => ({ id, type: "syncedBlock", version: 1, props: { syncedBlockId: "source" } }));
  await service.execute("admin", "ws", 1, [{ kind: "createPage", page: page("secret") }, { kind: "createPage", page: consumer }, { kind: "saveSharedBlock", source: { id: "source", ownerPageId: "secret", revision: 1, blocks: [paragraph([text("Initial")], { id: "content" })] }, expectedRevision: null }]);
  await assert.rejects(service.resolveDocument("member", "ws", "consumer"), /denied/);
  await service.execute("admin", "ws", 2, [{ kind: "saveSharedBlock", source: { id: "source", ownerPageId: "secret", revision: 1, blocks: [paragraph([text("Changed")], { id: "content" })] }, expectedRevision: 1 }]);
  const resolved = await service.resolveDocument("admin", "ws", "consumer");
  assert.equal(resolved.blocks[0]?.children?.[0]?.id, "first/content");
  assert.equal(resolved.blocks[1]?.children?.[0]?.id, "second/content");
  assert.deepEqual(resolved.blocks[0]?.children?.[0]?.content, [text("Changed")]);
});

test("unsync creates independent blocks and template instantiation regenerates nested IDs", async () => {
  const { service } = setup();
  await service.create("admin", "ws");
  const owner = page("owner"), consumer = page("consumer");
  consumer.document.blocks = [{ id: "sync", type: "syncedBlock", version: 1, props: { syncedBlockId: "source" } }];
  await service.execute("admin", "ws", 1, [{ kind: "createPage", page: owner }, { kind: "createPage", page: consumer }, { kind: "saveSharedBlock", source: { id: "source", ownerPageId: "owner", revision: 1, blocks: [paragraph([text("Source")], { id: "original" })] }, expectedRevision: null }]);
  await service.execute("admin", "ws", 2, [{ kind: "unsyncBlock", pageId: "consumer", blockId: "sync" }]);
  await service.execute("admin", "ws", 3, [{ kind: "saveSharedBlock", source: { id: "source", ownerPageId: "owner", revision: 1, blocks: [paragraph([text("Changed")], { id: "original" })] }, expectedRevision: 1 }]);
  const independent = await service.resolveDocument("admin", "ws", "consumer");
  assert.equal(independent.blocks[0]?.type, "paragraph"); assert.notEqual(independent.blocks[0]?.id, "original"); assert.deepEqual(independent.blocks[0]?.content, [text("Source")]);
  const template = page("template").document;
  template.blocks[0]!.children = [paragraph([text("Nested")], { id: "nested" })];
  const copy = instantiateTemplate(template);
  assert.notEqual(copy.id, template.id); assert.notEqual(copy.blocks[0]?.id, template.blocks[0]?.id); assert.notEqual(copy.blocks[0]?.children?.[0]?.id, "nested");
  assert.equal(template.blocks[0]?.children?.[0]?.id, "nested");
});
