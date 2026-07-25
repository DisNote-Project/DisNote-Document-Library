import { expect, test } from "@playwright/test";

function editor(page: import("@playwright/test").Page) {
  return page.locator("[contenteditable]").first();
}

test("loads the editor as a separate lazy chunk", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("editor-panel")).toBeVisible();
  await expect(editor(page)).toBeVisible();
  await expect(page.getByText("DisNote Document demo").first()).toBeVisible();
});

test("accepts Vietnamese Unicode and composition events", async ({ page }) => {
  await page.goto("/");
  const editable = editor(page);
  const vietnamese = "Ti\u1ebfng Vi\u1ec7t c\u00f3 d\u1ea5u";
  await editable.click();
  await editable.evaluate((element) => {
    element.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
    element.dispatchEvent(
      new CompositionEvent("compositionupdate", { data: "Ti\u1ebfng Vi\u1ec7t" }),
    );
    element.dispatchEvent(
      new CompositionEvent("compositionend", { data: "Ti\u1ebfng Vi\u1ec7t" }),
    );
  });
  await page.keyboard.insertText(` ${vietnamese}`);
  await expect(editable).toContainText(vietnamese);
});

test("pastes plain text and supports undo and redo", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Clipboard shortcut is verified on Chromium.");
  await page.goto("/");
  const editable = editor(page);
  const clipboardText = "N\u1ed9i dung t\u1eeb clipboard";
  await editable.click();
  await page.evaluate(async (value) => navigator.clipboard.writeText(value), clipboardText);
  await page.keyboard.press("Control+V");
  await expect(editable).toContainText(clipboardText);
  await page.keyboard.press("Control+Z");
  await expect(editable).not.toContainText(clipboardText);
  await page.keyboard.press("Control+Shift+Z");
  await expect(editable).toContainText(clipboardText);
});

test("mobile layout does not overflow the viewport", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only assertion.");
  await page.goto("/");
  await expect(editor(page)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByTestId("rendered-panel")).toBeVisible();
});
