import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createI18n,
  defineEditorMessages,
  EN_EDITOR_MESSAGES,
  type EditorMessageKey,
  defaultSlashCommands,
  filterSlashCommands,
} from "../../src/editor/index.js";
import { mathPaletteItems } from "../../src/math/index.js";

test("i18n uses centralized English messages by default", () => {
  const i18n = createI18n();
  assert.equal(i18n.locale, "en");
  assert.equal(i18n.t("slash.heading1"), "Heading 1");
  assert.equal(i18n.messages["toolbar.bold"], EN_EDITOR_MESSAGES["toolbar.bold"]);
});

test("i18n accepts typed partial overrides and keeps English fallbacks", () => {
  const i18n = createI18n({
    locale: "custom",
    messages: { "slash.heading1": "Custom heading" },
  });
  assert.equal(i18n.locale, "custom");
  assert.equal(i18n.t("slash.heading1"), "Custom heading");
  assert.equal(i18n.t("toolbar.bold"), "Bold");
  assert.equal(
    defineEditorMessages({ "toolbar.bold": "Strong" })["toolbar.bold"],
    "Strong"
  );
});

test("every math palette item has a centralized English message", () => {
  const i18n = createI18n();
  for (const item of mathPaletteItems) {
    const key = `math.item.${item.id}` as EditorMessageKey;
    assert.equal(i18n.t(key), item.description);
  }
});

test("slash menu registry filters by English id and keywords", () => {
  assert.equal(filterSlashCommands("").length, defaultSlashCommands.length);
  assert.deepEqual(filterSlashCommands("h1").map((c) => c.id), ["heading1"]);
  assert.ok(filterSlashCommands("heading").some((c) => c.id === "heading1"));
  assert.equal(filterSlashCommands("zzz").length, 0);
});

test("each slash command builds a valid block of the right type", () => {
  const byId = Object.fromEntries(defaultSlashCommands.map((c) => [c.id, c.create()]));
  assert.equal(byId["heading1"]?.type, "heading");
  assert.equal(byId["heading1"]?.props["level"], 1);
  assert.equal(byId["checklist"]?.type, "checklistItem");
  assert.equal(byId["divider"]?.type, "divider");
});
