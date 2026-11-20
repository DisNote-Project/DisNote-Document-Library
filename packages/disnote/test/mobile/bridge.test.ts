import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedMobileEditorEvent } from "../../src/mobile/bridge.js";

test("mobile editor accepts same-origin and explicitly trusted parent messages only", () => {
  const selfOrigin = "https://editor.disnote.app";
  const hostOrigin = "https://app.disnote.app";
  assert.equal(isAllowedMobileEditorEvent({ source: "self", origin: selfOrigin, selfOrigin }), true);
  assert.equal(isAllowedMobileEditorEvent({ source: "none", origin: "", selfOrigin }), true);
  assert.equal(isAllowedMobileEditorEvent({ source: "parent", origin: hostOrigin, selfOrigin, allowedHostOrigins: [hostOrigin] }), true);
  assert.equal(isAllowedMobileEditorEvent({ source: "parent", origin: "https://evil.example", selfOrigin, allowedHostOrigins: [hostOrigin] }), false);
  assert.equal(isAllowedMobileEditorEvent({ source: "foreign", origin: hostOrigin, selfOrigin, allowedHostOrigins: [hostOrigin] }), false);
});
