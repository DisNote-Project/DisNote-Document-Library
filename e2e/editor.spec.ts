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

test("pastes VS Code Markdown Preview HTML as structured document blocks", async ({ page }) => {
  await page.goto("/");
  const editable = editor(page);
  await editable.click();

  await editable.evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData(
      "text/html",
      [
        "<meta charset='utf-8'>",
        "<!--StartFragment-->",
        '<div class="markdown-body">',
        "<h1>Preview title</h1>",
        "<p>Paragraph with <strong>bold text</strong>.</p>",
        "<h2>Targets</h2>",
        "<ul><li>Desktop</li><li>Mobile<ul><li>iOS</li></ul></li></ul>",
        "</div>",
        "<!--EndFragment-->",
      ].join(""),
    );
    clipboardData.setData(
      "text/plain",
      "Preview title\nParagraph with bold text.\nTargets\nDesktop\nMobile\niOS",
    );
    element.dispatchEvent(new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData,
    }));
  });

  const rendered = page.getByTestId("rendered-panel");
  await expect(rendered.getByRole("heading", { level: 1, name: "Preview title" })).toBeVisible();
  await expect(rendered.getByRole("heading", { level: 2, name: "Targets" })).toBeVisible();
  await expect(rendered.locator("strong")).toContainText("bold text");
  await expect(rendered.locator("ul li")).toHaveCount(3);
});

test("builds and renders a math equation from the Word-like palette", async ({ page }) => {
  await page.goto("/");
  const editable = editor(page);
  await editable.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/math");
  await page.getByText("Math Equation", { exact: true }).click();

  const equationInput = page.locator(
    ".disnote-math-equation-editor math-field"
  );
  await expect(equationInput).toBeVisible();
  await page.getByRole("button", { name: "Fraction" }).click();
  await page.keyboard.type("x");
  await page.keyboard.press("Tab");
  await page.keyboard.type("y");
  await expect
    .poll(() =>
      equationInput.evaluate((field) =>
        (field as HTMLElement & {
          getValue(format?: string): string;
        }).getValue("latex-without-placeholders")
      )
    )
    .toBe("\\frac{x}{y}");

  await expect(page.locator(".disnote-math-equation-editor textarea")).toHaveCount(0);
  const rendered = page.getByTestId("rendered-panel");
  await expect(rendered.locator("math")).toBeVisible();
  await expect(rendered.locator("mfrac")).toHaveCount(1);
  await expect(rendered).not.toContainText("$$");
});

test("mobile layout does not overflow the viewport", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only assertion.");
  await page.goto("/");
  await expect(editor(page)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByTestId("rendered-panel")).toBeVisible();
});
