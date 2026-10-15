import { expect, test } from "@playwright/test";

test("database CRUD survives reload and all six views render records", async ({ page }) => {
  await page.goto("/parity");
  const database = page.getByTestId("parity-database");
  await expect(database.getByRole("table")).toBeVisible();
  await database.getByRole("button", { name: "Thêm bản ghi", exact: true }).click();
  const form = database.getByRole("form", { name: "Sửa bản ghi" });
  await form.getByLabel("Tiêu đề", { exact: true }).fill("Browser task");
  await form.getByRole("combobox", { name: "Bảng Kanban", exact: true }).selectOption("done");
  await form.getByLabel("Lịch", { exact: true }).fill("2026-10-15");
  await form.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(database.getByRole("cell", { name: "Browser task", exact: true })).toBeVisible();
  await page.reload();
  await expect(database.getByRole("cell", { name: "Browser task", exact: true })).toBeVisible();
  for (const name of ["Bảng Kanban", "Danh sách", "Bộ sưu tập", "Lịch", "Dòng thời gian"]) {
    await database.getByRole("button", { name, exact: true }).first().click();
    await expect(database.getByText("Browser task", { exact: true }).first()).toBeVisible();
  }
  await database.getByRole("button", { name: "Bảng", exact: true }).first().click();
  const row = database.getByRole("row").filter({ hasText: "Browser task" });
  await row.getByRole("button", { name: "Xóa", exact: true }).click();
  await expect(database.getByText("Browser task", { exact: true })).toHaveCount(0);
});

test("comments reply, resolve and persist after reload", async ({ page }) => {
  await page.goto("/parity");
  const panel = page.getByTestId("parity-comments");
  await panel.getByRole("textbox", { name: "Thêm bình luận" }).fill("Browser comment");
  await panel.getByRole("button", { name: "Thêm bình luận", exact: true }).click();
  await expect(panel.getByText("Browser comment", { exact: true })).toBeVisible();
  const thread = panel.locator("article").filter({ hasText: "Browser comment" });
  await thread.getByRole("textbox", { name: "Trả lời" }).fill("Browser reply");
  await thread.getByRole("button", { name: "Trả lời", exact: true }).click();
  await expect(thread.getByText("Browser reply", { exact: true })).toBeVisible();
  await thread.getByRole("button", { name: "Giải quyết", exact: true }).click();
  await expect(thread.getByRole("button", { name: "Mở lại", exact: true })).toBeVisible();
  await page.reload();
  await expect(thread.getByText("Browser reply", { exact: true })).toBeVisible();
  await expect(thread.getByRole("button", { name: "Mở lại", exact: true })).toBeVisible();
});

test("IndexedDB keeps offline editor text after reload", async ({ page }) => {
  await page.goto("/parity");
  const offline = page.getByTestId("parity-offline");
  const editable = offline.locator("[contenteditable=true]").first();
  await editable.click(); await page.keyboard.press("Control+End"); await page.keyboard.insertText(" Saved offline");
  await expect(offline.locator('[role=status]')).toHaveAttribute("data-pending", /^[1-9]/);
  await page.reload();
  await expect(offline.locator("[contenteditable=true]").first()).toContainText("Saved offline");
});

test("two editors converge through Yjs and reconnect a new page", async ({ page, context }) => {
  await page.goto("/parity");
  const second = await context.newPage(); await second.goto("/parity");
  const firstEditor = page.getByTestId("parity-collaboration").locator("[contenteditable=true]").first();
  const secondEditor = second.getByTestId("parity-collaboration").locator("[contenteditable=true]").first();
  await expect(secondEditor).toBeVisible();
  await firstEditor.click(); await page.keyboard.insertText("Client A ");
  await expect(secondEditor).toContainText("Client A");
  await secondEditor.click(); await second.keyboard.press("Control+End"); await second.keyboard.insertText("Client B");
  await expect(firstEditor).toContainText("Client B");
  await second.reload();
  await expect(secondEditor).toContainText("Client A"); await expect(secondEditor).toContainText("Client B");
  await second.close();
});

test("shared source edits update both occurrences and the resolved renderer", async ({ page }) => {
  await page.goto("/parity");
  const preview = page.getByTestId("parity-shared-preview");
  await expect(preview.getByText("Shared seed", { exact: true })).toHaveCount(2);
  const control = page.getByTestId("parity-shared-editor").getByRole("region", { name: "Nội dung đồng bộ", exact: true }).first();
  await control.getByRole("button", { name: "Sửa nội dung dùng chung", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Sửa nội dung dùng chung", exact: true });
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(control.getByRole("button", { name: "Sửa nội dung dùng chung", exact: true })).toBeFocused();
  await control.getByRole("button", { name: "Sửa nội dung dùng chung", exact: true }).click();
  await page.screenshot({ path: test.info().outputPath("shared-edit-dialog.png") });
  await dialog.getByText("Shared seed", { exact: true }).click();
  await page.keyboard.press("End"); await page.keyboard.insertText(" changed");
  await expect(dialog.getByText("Shared seed changed", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(preview.getByText("Shared seed changed", { exact: true })).toHaveCount(2);
  await page.reload();
  await expect(preview.getByText("Shared seed changed", { exact: true })).toHaveCount(2);
});

test("page creation, navigation, trash and restore persist", async ({ page }) => {
  await page.goto("/parity");
  const pages = page.getByTestId("parity-pages");
  await pages.getByRole("button", { name: "Owner", exact: true }).click();
  await expect(page.getByTestId("parity-selected-page")).toContainText("Owner");
  await pages.getByRole("textbox", { name: "Tiêu đề", exact: true }).fill("Browser page");
  await pages.getByRole("button", { name: "Tạo trang", exact: true }).click();
  const item = pages.locator("li").filter({ has: page.getByRole("button", { name: "Browser page", exact: true }) });
  await item.getByRole("button", { name: "Xóa", exact: true }).click();
  await expect(pages.getByRole("button", { name: "Browser page", exact: true })).toHaveCount(0);
  await pages.getByRole("button", { name: "Thùng rác", exact: true }).click();
  await item.getByRole("button", { name: "Khôi phục", exact: true }).click();
  await pages.getByRole("button", { name: "Trang", exact: true }).click();
  await expect(pages.getByRole("button", { name: "Browser page", exact: true })).toBeVisible();
  await page.reload(); await expect(pages.getByRole("button", { name: "Browser page", exact: true })).toBeVisible();
});

test("history restore appends a durable revision", async ({ page }) => {
  await page.goto("/parity");
  const history = page.getByTestId("parity-history");
  await expect(history.getByRole("listitem")).toHaveCount(2);
  const first = history.getByRole("listitem").filter({ has: page.getByRole("button", { name: /^1 ·/ }) });
  await first.getByRole("button", { name: "Khôi phục", exact: true }).click();
  await expect(history.getByRole("listitem")).toHaveCount(3);
  await page.reload(); await expect(history.getByRole("listitem")).toHaveCount(3);
});

test("offline queue drains when its remote repository becomes available", async ({ page }) => {
  await page.goto("/parity");
  const offline = page.getByTestId("parity-offline"), editable = offline.locator("[contenteditable=true]").first();
  await editable.click(); await page.keyboard.press("Control+End"); await page.keyboard.insertText(" Queued change");
  await expect(offline.locator('[role=status]')).toHaveAttribute("data-pending", /^[1-9]/);
  await offline.getByRole("button", { name: "Đã kết nối", exact: true }).click();
  await expect(offline.locator('[role=status]')).toHaveAttribute("data-pending", "0");
  await page.reload(); await expect(editable).toContainText("Queued change");
  await expect(offline.locator('[role=status]')).toHaveAttribute("data-pending", "0");
});

test("mobile bridge validates initialization and emits edited document JSON", async ({ page }) => {
  await page.goto("/mobile-editor");
  await expect(page.getByTestId("mobile-output")).toContainText('"kind":"ready"');
  await page.evaluate(() => window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ version: 1, kind: "initialize", editable: true, locale: "vi", document: { format: "disnote-document", schemaVersion: 1, id: "mobile-doc", metadata: { createdAt: "2026-10-14T00:00:00Z", updatedAt: "2026-10-14T00:00:00Z" }, blocks: [{ id: "mobile-block", type: "paragraph", version: 1, props: {}, content: [{ type: "text", text: "Mobile content" }] }] } }) })));
  const editable = page.locator("[contenteditable=true]").first();
  await editable.click(); await page.keyboard.press("Control+End"); await page.keyboard.insertText(" Tiếng Việt");
  await expect(page.getByTestId("mobile-output")).toContainText("Tiếng Việt");
  await page.evaluate(() => window.dispatchEvent(new MessageEvent("message", { origin: "https://untrusted.example", data: JSON.stringify({ version: 1, kind: "initialize", editable: false, locale: "en", document: {} }) })));
  await expect(editable).toContainText("Mobile content");
});
