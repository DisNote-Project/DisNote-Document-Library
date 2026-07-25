import { test } from "node:test";
import assert from "node:assert/strict";
import { createI18n, defaultSlashCommands, filterSlashCommands } from "../../src/editor/index.js";

test("i18n returns localized full-sentence strings", () => {
  assert.equal(createI18n("en").t("slash.heading1"), "Heading 1");
  assert.equal(createI18n("vi").t("slash.heading1"), "Tiêu đề 1");
  // unknown locale falls back to English
  assert.equal(createI18n("xx" as never).t("toolbar.bold"), "Bold");
});

test("slash menu registry filters by id and keywords (incl. Vietnamese)", () => {
  assert.equal(filterSlashCommands("").length, defaultSlashCommands.length);
  assert.deepEqual(filterSlashCommands("h1").map((c) => c.id), ["heading1"]);
  assert.ok(filterSlashCommands("tiêu đề").some((c) => c.id === "heading1"));
  assert.equal(filterSlashCommands("zzz").length, 0);
});

test("each slash command builds a valid block of the right type", () => {
  const byId = Object.fromEntries(defaultSlashCommands.map((c) => [c.id, c.create()]));
  assert.equal(byId["heading1"]?.type, "heading");
  assert.equal(byId["heading1"]?.props["level"], 1);
  assert.equal(byId["checklist"]?.type, "checklistItem");
  assert.equal(byId["divider"]?.type, "divider");
});
