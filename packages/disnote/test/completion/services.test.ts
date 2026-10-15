import { test } from "node:test";
import assert from "node:assert/strict";
import { articleRegistry, createDocument, paragraph, text, checksum } from "../../src/core/index.js";
import { InMemoryOfflineStore, OfflineDocumentController } from "../../src/offline/index.js";
import { CommentService, InMemoryCommentRepository, remapCommentAnchors } from "../../src/comments/index.js";
import { DocumentSearchService, InMemorySearchIndex, buildSearchProjection, DocumentAIService } from "../../src/search-ai/index.js";
import { DocumentHistoryService, InMemoryDocumentRepository } from "../../src/storage/index.js";
import { exportDocumentBundle, importDocumentBundle, importNotionBlocks } from "../../src/import-export/index.js";
import { createI18n, EN_EDITOR_MESSAGES, VI_EDITOR_MESSAGES } from "../../src/editor/index.js";
import { mobileCommandScript, parseMobileEditorMessage } from "../../src/mobile/bridge.js";

const document = () => createDocument({ id: "doc", metadata: { title: "Test" }, blocks: [paragraph([text("Initial")], { id: "block" })] });
test("offline retries preserve idempotency, retain newer edits and detect remote conflicts", async () => {
  const store = new InMemoryOfflineStore(); let revision = 1, online = false, sequence = 0; const seen = new Map<string, number>();
  const controller = new OfflineDocumentController(store, { async saveDraft(input) {
    if (!online) throw new Error("network-unavailable");
    const accepted = seen.get(input.idempotencyKey); if (accepted) return { ok: true, revision: accepted };
    if (input.expectedRevision !== revision) return { ok: false, reason: "revision-conflict", currentRevision: revision };
    revision++; seen.set(input.idempotencyKey, revision); return { ok: true, revision };
  } }, "actor", () => String(++sequence));
  await controller.download(document(), 1);
  const first = document(); first.metadata.title = "First";
  await controller.edit(first); await assert.rejects(controller.flush("doc"), /network/);
  assert.equal((await controller.read("doc"))?.pending.length, 1);
  const second = document(); second.metadata.title = "Second";
  await controller.edit(second); online = true;
  const synced = await controller.flush("doc"); assert.equal(synced.pending.length, 0); assert.equal(revision, 3); assert.equal(synced.document.metadata.title, "Second");
  await controller.edit(first); revision = 5;
  const conflict = await controller.flush("doc"); assert.equal(conflict.conflict, 5); assert.equal(conflict.pending.length, 1);
  await controller.download(second, 5); assert.equal((await controller.read("doc"))?.document.metadata.title, "First");
  await controller.resolveConflict(second, 5); assert.equal((await controller.flush("doc")).remoteRevision, 6);
});

test("comments commit an outbox event atomically and enforce permissions/CAS", async () => {
  const repository = new InMemoryCommentRepository(); let id = 0;
  const service = new CommentService(repository, { async assert(actor) { if (actor === "denied") throw new Error("denied"); } }, () => String(++id));
  const created = await service.create("user", "doc", { type: "inline-range", blockId: "block", start: 3, end: 8 }, "Hello", 1, 0);
  assert.equal(created.events.length, 1); assert.equal(created.threads.length, 1);
  const threadId = created.threads[0]!.id;
  await assert.rejects(service.reply("denied", "doc", threadId, "Hidden", 1), /denied/);
  await service.reply("user", "doc", threadId, "Reply", 1);
  await assert.rejects(service.status("user", "doc", threadId, "resolved", 1), /revision-conflict/);
  const resolved = await service.status("user", "doc", threadId, "resolved", 2);
  assert.equal(resolved.threads[0]?.status, "resolved"); assert.equal(resolved.events.length, 3);
  const moved = remapCommentAnchors(created.threads, [{ blockId: "block", start: 1, deleteCount: 0, insertLength: 4 }]);
  assert.deepEqual(moved[0]?.anchor, { type: "inline-range", blockId: "block", start: 7, end: 12 });
  assert.equal(remapCommentAnchors(moved, [{ blockId: "block", start: 7, deleteCount: 5, insertLength: 0 }])[0]?.orphaned, true);
  assert.deepEqual(created.threads[0]?.anchor, { type: "inline-range", blockId: "block", start: 3, end: 8 });
});

test("search filters permission before count/snippets and ignores older projections", async () => {
  const index = new InMemorySearchIndex(), doc = document();
  await index.upsert(buildSearchProjection(doc, articleRegistry, 2));
  await index.upsert(buildSearchProjection({ ...doc, metadata: { ...doc.metadata, title: "Old" } }, articleRegistry, 1));
  await index.upsert(buildSearchProjection({ ...doc, id: "secret" }, articleRegistry, 1));
  const service = new DocumentSearchService(index, { async canRead(_actor, id) { return id !== "secret"; } });
  const result = await service.search("member", "initial");
  assert.equal(result.total, 1); assert.equal(result.results[0]?.title, "Test");
});

test("AI checks all context permissions, validates preview and rejects stale confirmation", async () => {
  let called = 0;
  const service = new DocumentAIService({ async generate() { called++; return [{ kind: "update", blockId: "block", patch: { content: [text("Changed")] } }]; } }, { async assert(_actor, id) { if (id === "secret") throw new Error("denied"); } }, articleRegistry);
  const doc = document();
  await assert.rejects(service.preview("user", doc, "Summarize", [{ ...doc, id: "secret" }]), /denied/); assert.equal(called, 0);
  const preview = await service.preview("user", doc, "Rewrite");
  assert.equal(preview.diff[0]?.change, "changed"); assert.notEqual(checksum(preview.document), checksum(doc));
  assert.deepEqual((await service.confirm("user", doc, preview)).blocks[0]?.content, [text("Changed")]);
  await assert.rejects(service.confirm("user", { ...doc, metadata: { ...doc.metadata, title: "New" } }, preview), /stale/);
});

test("history restore makes a new revision without modifying published pointers", async () => {
  const repository = new InMemoryDocumentRepository({ registry: articleRegistry });
  await repository.create({ document: document(), slug: "test", title: "Test", locale: "en", kind: "ARTICLE", actor: "user" });
  await repository.publish({ documentId: "doc", revision: 1, actor: "user" });
  const modified = document(); modified.blocks[0]!.content = [text("New")];
  await repository.saveDraft({ documentId: "doc", document: modified, expectedRevision: 1, idempotencyKey: "edit", actor: "user" });
  const history = new DocumentHistoryService(repository, { async assert() {} });
  assert.equal((await history.compare("user", "doc", 1, 2))[0]?.change, "changed");
  assert.deepEqual(await history.restore("user", "doc", 1, 2, "restore"), { ok: true, revision: 3 });
  assert.equal((await repository.getById("doc"))?.publishedRevision, 1);
  assert.deepEqual((await repository.getRevision("doc", 3))?.document.blocks[0]?.content, [text("Initial")]);
});

test("bundle roundtrip preserves assets/hierarchy and rejects cycles/invalid bytes", () => {
  const pages = [{ parentId: null, document: document() }, { parentId: "doc", document: { ...document(), id: "child" } }];
  const output = exportDocumentBundle(pages, [{ id: "asset", name: "image.png", mime: "image/png", bytes: [0, 255, 128] }]);
  assert.equal(importDocumentBundle(output).pages[1]?.parentId, "doc");
  const cycle = JSON.parse(output); cycle.pages[0].parentId = "child";
  assert.throws(() => importDocumentBundle(cycle), /invalid-workspace-bundle/);
  const invalid = JSON.parse(output); invalid.assets[0].bytes = [256];
  assert.throws(() => importDocumentBundle(invalid), /invalid-workspace-bundle/);
});

test("Notion imports formatting, nested blocks/references and reports incomplete exports", () => {
  const result = importNotionBlocks([
    { id: "heading", type: "heading_2", heading_2: { rich_text: [{ plain_text: "Title", annotations: { bold: true } }] } },
    { id: "list", type: "bulleted_list_item", has_children: true, bulleted_list_item: { rich_text: [] }, children: [{ id: "todo", type: "to_do", to_do: { checked: true, rich_text: [{ plain_text: "Task" }] } }] },
    { id: "missing", type: "paragraph", has_children: true, paragraph: { rich_text: [{ type: "mention", plain_text: "Page", mention: { page: { id: "target" } } }] } },
  ]);
  assert.equal(result.document.blocks[0]?.props["level"], 2);
  assert.equal(result.document.blocks[1]?.children?.[0]?.props["checked"], true);
  assert.equal(result.document.blocks[2]?.content?.[0]?.type, "reference");
  assert.equal(result.warnings.length, 1);
});

test("complete Vietnamese dictionary and mobile messages preserve data safely", () => {
  assert.deepEqual(Object.keys(VI_EDITOR_MESSAGES).sort(), Object.keys(EN_EDITOR_MESSAGES).sort());
  assert.equal(createI18n("vi-VN").t("toolbar.bold"), "In đậm");
  const doc = document(); doc.metadata.title = "');window.pwned=true;//</script>";
  const message = parseMobileEditorMessage(JSON.stringify({ version: 1, kind: "document", document: doc }));
  assert.equal(message.kind, "document");
  if (message.kind === "document") assert.deepEqual(message.document, doc);
  assert.throws(() => parseMobileEditorMessage('{"version":1,"kind":"document","document":{}}'), /invalid-mobile/);
  const script = mobileCommandScript({ version: 1, kind: "initialize", document: doc, editable: true, locale: "vi" });
  const received: { data?: string; pwned?: boolean } = {};
  class FakeMessageEvent { constructor(readonly type: string, readonly options: { data: string }) {} }
  const fakeWindow = { dispatchEvent(event: FakeMessageEvent) { received.data = event.options.data; }, pwned: false };
  new Function("window", "MessageEvent", script)(fakeWindow, FakeMessageEvent);
  assert.equal(fakeWindow.pwned, false);
  assert.equal(JSON.parse(received.data!).document.metadata.title, doc.metadata.title);
});
