# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: parity.spec.ts >> database CRUD survives reload and all six views render records
- Location: e2e\parity.spec.ts:3:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByTestId('parity-database').getByRole('row').filter({ hasText: 'Browser task' }).getByRole('button', { name: 'Xóa', exact: true })
    - locator resolved to <button type="button">Xóa</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <td>2026-10-15</td> intercepts pointer events
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <td>2026-10-14</td> from <tr draggable="false">…</tr> subtree intercepts pointer events
  2 × retrying click action
      - waiting 100ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <nav>…</nav> intercepts pointer events
  27 × retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <td>2026-10-15</td> intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <td>2026-10-14</td> from <tr draggable="false">…</tr> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <nav>…</nav> intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <nav>…</nav> intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- main [ref=f1e3]:
  - button "en" [ref=f1e4]
  - generic [ref=f1e5]:
    - navigation [ref=f1e6]:
      - button "Bảng" [active] [ref=f1e7]
      - button "Bảng Kanban" [ref=f1e8]
      - button "Danh sách" [ref=f1e9]
      - button "Bộ sưu tập" [ref=f1e10]
      - button "Lịch" [ref=f1e11]
      - button "Dòng thời gian" [ref=f1e12]
      - button "Bản đồ" [ref=f1e13]
    - region "Tasks" [ref=f1e14]:
      - generic [ref=f1e15]:
        - heading "Tasks" [level=3] [ref=f1e16]
        - generic [ref=f1e17]: 2 Bản ghi
      - button "Thêm bản ghi" [ref=f1e18]
      - table [ref=f1e20]:
        - rowgroup [ref=f1e21]:
          - row [ref=f1e22]:
            - columnheader "Tiêu đề" [ref=f1e23]
            - columnheader "Bảng Kanban" [ref=f1e24]
            - columnheader "Lịch" [ref=f1e25]
            - columnheader "Bản ghi" [ref=f1e26]
        - rowgroup [ref=f1e27]:
          - row [ref=f1e28]:
            - cell "First task" [ref=f1e29]
            - cell "todo" [ref=f1e30]
            - cell "2026-10-14" [ref=f1e31]
            - cell [ref=f1e32]:
              - button "Sửa bản ghi" [ref=f1e33]
              - button "Xóa" [ref=f1e34]
          - row [ref=f1e35]:
            - cell "Browser task" [ref=f1e36]
            - cell "done" [ref=f1e37]
            - cell "2026-10-15" [ref=f1e38]
            - cell [ref=f1e39]:
              - button "Sửa bản ghi" [ref=f1e40]
              - button "Xóa" [ref=f1e41]
      - navigation "Bản ghi" [ref=f1e42]:
        - button "Trước" [disabled] [ref=f1e43]
        - generic [ref=f1e44]: 1–2 / 2
        - button "Sau" [disabled] [ref=f1e45]
  - complementary "Bình luận" [ref=f1e47]:
    - heading "Bình luận" [level=3] [ref=f1e48]
    - generic [ref=f1e49]:
      - textbox "Thêm bình luận" [ref=f1e50]
      - button "Thêm bình luận" [disabled] [ref=f1e51]
  - generic [ref=f1e52]:
    - button "Đã kết nối" [ref=f1e53]
    - generic [ref=f1e54]:
      - status [ref=f1e55]: Đã lưu mọi thay đổi
      - textbox [ref=f1e58]:
        - paragraph [ref=f1e63]: Revision two
  - textbox [ref=f1e68]:
    - generic [ref=f1e72]:
      - paragraph [ref=f1e73]
      - text: Nhập văn bản hoặc gõ '/' để thêm định dạng
  - navigation "Trang" [ref=f1e75]:
    - button "Thùng rác" [ref=f1e76]
    - list [ref=f1e77]:
      - listitem [ref=f1e78]:
        - button "Owner" [ref=f1e79]
        - button "Xóa" [ref=f1e80]
        - combobox "Đường dẫn trang" [ref=f1e81]:
          - option "Chưa phân nhóm" [selected]
          - option "Consumer"
        - list [ref=f1e82]:
          - listitem [ref=f1e83]:
            - button "Consumer" [ref=f1e84]
            - button "Xóa" [ref=f1e85]
            - combobox "Đường dẫn trang" [ref=f1e86]:
              - option "Chưa phân nhóm"
              - option "Owner" [selected]
            - list
    - generic [ref=f1e87]:
      - textbox "Tiêu đề" [ref=f1e88]
      - combobox "Nút mẫu" [ref=f1e89]:
        - option "Chưa phân nhóm" [selected]
      - button "Tạo trang" [disabled] [ref=f1e90]
  - textbox [ref=f1e94]:
    - generic [ref=f1e95]:
      - region "Nội dung đồng bộ" [ref=f1e102]:
        - generic [ref=f1e103]:
          - text: Nguồn dùng chung
          - combobox "Nguồn dùng chung" [ref=f1e104]:
            - option
            - option "parity-source · parity-owner" [selected]
        - paragraph [ref=f1e106]: Shared seed
        - button "Sửa nội dung dùng chung" [ref=f1e107]
      - region "Nội dung đồng bộ" [ref=f1e114]:
        - generic [ref=f1e115]:
          - text: Nguồn dùng chung
          - combobox "Nguồn dùng chung" [ref=f1e116]:
            - option
            - option "parity-source · parity-owner" [selected]
        - paragraph [ref=f1e118]: Shared seed
        - button "Sửa nội dung dùng chung" [ref=f1e119]
  - generic [ref=f1e122]:
    - generic [ref=f1e123]:
      - generic [ref=f1e124]: Nội dung đồng bộ
      - paragraph [ref=f1e125]: Shared seed
    - generic [ref=f1e126]:
      - generic [ref=f1e127]: Nội dung đồng bộ
      - paragraph [ref=f1e128]: Shared seed
  - complementary "Lịch sử phiên bản" [ref=f1e130]:
    - heading "Lịch sử phiên bản" [level=3] [ref=f1e131]
    - list [ref=f1e132]:
      - listitem [ref=f1e133]:
        - button "1 · demo-user · 2026-10-18T16:31:42.125Z" [ref=f1e134]
        - button "Khôi phục" [ref=f1e135]
      - listitem [ref=f1e136]:
        - button "2 · demo-user · 2026-10-18T16:31:42.128Z" [ref=f1e137]
        - button "Khôi phục" [disabled] [ref=f1e138]
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | 
  3   | test("database CRUD survives reload and all six views render records", async ({ page }) => {
  4   |   await page.goto("/parity");
  5   |   const database = page.getByTestId("parity-database");
  6   |   await expect(database.getByRole("table")).toBeVisible();
  7   |   await database.getByRole("button", { name: "Thêm bản ghi", exact: true }).click();
  8   |   const form = database.getByRole("form", { name: "Sửa bản ghi" });
  9   |   await form.getByLabel("Tiêu đề", { exact: true }).fill("Browser task");
  10  |   await form.getByRole("combobox", { name: "Bảng Kanban", exact: true }).selectOption("done");
  11  |   await form.getByLabel("Lịch", { exact: true }).fill("2026-10-15");
  12  |   await form.getByRole("button", { name: "Lưu", exact: true }).click();
  13  |   await expect(database.getByRole("cell", { name: "Browser task", exact: true })).toBeVisible();
  14  |   await page.reload();
  15  |   await expect(database.getByRole("cell", { name: "Browser task", exact: true })).toBeVisible();
  16  |   for (const name of ["Bảng Kanban", "Danh sách", "Bộ sưu tập", "Lịch", "Dòng thời gian"]) {
  17  |     await database.getByRole("button", { name, exact: true }).first().click();
  18  |     await expect(database.getByText("Browser task", { exact: true }).first()).toBeVisible();
  19  |   }
  20  |   await database.getByRole("button", { name: "Bảng", exact: true }).first().click();
  21  |   const row = database.getByRole("row").filter({ hasText: "Browser task" });
> 22  |   await row.getByRole("button", { name: "Xóa", exact: true }).click();
      |                                                               ^ Error: locator.click: Test timeout of 60000ms exceeded.
  23  |   await expect(database.getByText("Browser task", { exact: true })).toHaveCount(0);
  24  | });
  25  | 
  26  | test("comments reply, resolve and persist after reload", async ({ page }) => {
  27  |   await page.goto("/parity");
  28  |   const panel = page.getByTestId("parity-comments");
  29  |   await panel.getByRole("textbox", { name: "Thêm bình luận" }).fill("Browser comment");
  30  |   await panel.getByRole("button", { name: "Thêm bình luận", exact: true }).click();
  31  |   await expect(panel.getByText("Browser comment", { exact: true })).toBeVisible();
  32  |   const thread = panel.locator("article").filter({ hasText: "Browser comment" });
  33  |   await thread.getByRole("textbox", { name: "Trả lời" }).fill("Browser reply");
  34  |   await thread.getByRole("button", { name: "Trả lời", exact: true }).click();
  35  |   await expect(thread.getByText("Browser reply", { exact: true })).toBeVisible();
  36  |   await thread.getByRole("button", { name: "Giải quyết", exact: true }).click();
  37  |   await expect(thread.getByRole("button", { name: "Mở lại", exact: true })).toBeVisible();
  38  |   await page.reload();
  39  |   await expect(thread.getByText("Browser reply", { exact: true })).toBeVisible();
  40  |   await expect(thread.getByRole("button", { name: "Mở lại", exact: true })).toBeVisible();
  41  | });
  42  | 
  43  | test("IndexedDB keeps offline editor text after reload", async ({ page }) => {
  44  |   await page.goto("/parity");
  45  |   const offline = page.getByTestId("parity-offline");
  46  |   const editable = offline.locator("[contenteditable=true]").first();
  47  |   await editable.click(); await page.keyboard.press("Control+End"); await page.keyboard.insertText(" Saved offline");
  48  |   await expect(offline.locator('[role=status]')).toHaveAttribute("data-pending", /^[1-9]/);
  49  |   await page.reload();
  50  |   await expect(offline.locator("[contenteditable=true]").first()).toContainText("Saved offline");
  51  | });
  52  | 
  53  | test("two editors converge through Yjs and reconnect a new page", async ({ page, context }) => {
  54  |   await page.goto("/parity");
  55  |   const second = await context.newPage(); await second.goto("/parity");
  56  |   const firstEditor = page.getByTestId("parity-collaboration").locator("[contenteditable=true]").first();
  57  |   const secondEditor = second.getByTestId("parity-collaboration").locator("[contenteditable=true]").first();
  58  |   await expect(secondEditor).toBeVisible();
  59  |   await firstEditor.click(); await page.keyboard.insertText("Client A ");
  60  |   await expect(secondEditor).toContainText("Client A");
  61  |   await secondEditor.click(); await second.keyboard.press("Control+End"); await second.keyboard.insertText("Client B");
  62  |   await expect(firstEditor).toContainText("Client B");
  63  |   await second.reload();
  64  |   await expect(secondEditor).toContainText("Client A"); await expect(secondEditor).toContainText("Client B");
  65  |   await second.close();
  66  | });
  67  | 
  68  | test("shared source edits update both occurrences and the resolved renderer", async ({ page }) => {
  69  |   await page.goto("/parity");
  70  |   const preview = page.getByTestId("parity-shared-preview");
  71  |   await expect(preview.getByText("Shared seed", { exact: true })).toHaveCount(2);
  72  |   const control = page.getByTestId("parity-shared-editor").getByRole("region", { name: "Nội dung đồng bộ", exact: true }).first();
  73  |   await control.getByRole("button", { name: "Sửa nội dung dùng chung", exact: true }).click();
  74  |   const dialog = page.getByRole("dialog", { name: "Sửa nội dung dùng chung", exact: true });
  75  |   await expect(dialog).toBeFocused();
  76  |   await page.keyboard.press("Escape");
  77  |   await expect(dialog).toHaveCount(0);
  78  |   await expect(control.getByRole("button", { name: "Sửa nội dung dùng chung", exact: true })).toBeFocused();
  79  |   await control.getByRole("button", { name: "Sửa nội dung dùng chung", exact: true }).click();
  80  |   await page.screenshot({ path: test.info().outputPath("shared-edit-dialog.png") });
  81  |   await dialog.getByText("Shared seed", { exact: true }).click();
  82  |   await page.keyboard.press("End"); await page.keyboard.insertText(" changed");
  83  |   await expect(dialog.getByText("Shared seed changed", { exact: true })).toBeVisible();
  84  |   await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  85  |   await expect(preview.getByText("Shared seed changed", { exact: true })).toHaveCount(2);
  86  |   await page.reload();
  87  |   await expect(preview.getByText("Shared seed changed", { exact: true })).toHaveCount(2);
  88  | });
  89  | 
  90  | test("page creation, navigation, trash and restore persist", async ({ page }) => {
  91  |   await page.goto("/parity");
  92  |   const pages = page.getByTestId("parity-pages");
  93  |   await pages.getByRole("button", { name: "Owner", exact: true }).click();
  94  |   await expect(page.getByTestId("parity-selected-page")).toContainText("Owner");
  95  |   await pages.getByRole("textbox", { name: "Tiêu đề", exact: true }).fill("Browser page");
  96  |   await pages.getByRole("button", { name: "Tạo trang", exact: true }).click();
  97  |   const item = pages.locator("li").filter({ has: page.getByRole("button", { name: "Browser page", exact: true }) });
  98  |   await item.getByRole("button", { name: "Xóa", exact: true }).click();
  99  |   await expect(pages.getByRole("button", { name: "Browser page", exact: true })).toHaveCount(0);
  100 |   await pages.getByRole("button", { name: "Thùng rác", exact: true }).click();
  101 |   await item.getByRole("button", { name: "Khôi phục", exact: true }).click();
  102 |   await pages.getByRole("button", { name: "Trang", exact: true }).click();
  103 |   await expect(pages.getByRole("button", { name: "Browser page", exact: true })).toBeVisible();
  104 |   await page.reload(); await expect(pages.getByRole("button", { name: "Browser page", exact: true })).toBeVisible();
  105 | });
  106 | 
  107 | test("history restore appends a durable revision", async ({ page }) => {
  108 |   await page.goto("/parity");
  109 |   const history = page.getByTestId("parity-history");
  110 |   await expect(history.getByRole("listitem")).toHaveCount(2);
  111 |   const first = history.getByRole("listitem").filter({ has: page.getByRole("button", { name: /^1 ·/ }) });
  112 |   await first.getByRole("button", { name: "Khôi phục", exact: true }).click();
  113 |   await expect(history.getByRole("listitem")).toHaveCount(3);
  114 |   await page.reload(); await expect(history.getByRole("listitem")).toHaveCount(3);
  115 | });
  116 | 
  117 | test("offline queue drains when its remote repository becomes available", async ({ page }) => {
  118 |   await page.goto("/parity");
  119 |   const offline = page.getByTestId("parity-offline"), editable = offline.locator("[contenteditable=true]").first();
  120 |   await editable.click(); await page.keyboard.press("Control+End"); await page.keyboard.insertText(" Queued change");
  121 |   await expect(offline.locator('[role=status]')).toHaveAttribute("data-pending", /^[1-9]/);
  122 |   await offline.getByRole("button", { name: "Đã kết nối", exact: true }).click();
```