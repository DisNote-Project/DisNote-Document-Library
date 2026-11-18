# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: parity.spec.ts >> history restore appends a durable revision
- Location: e2e\parity.spec.ts:107:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByTestId('parity-history').getByRole('listitem').filter({ has: getByRole('button', { name: /^1 ·/ }) }).getByRole('button', { name: 'Khôi phục', exact: true })
    - locator resolved to <button type="button">Khôi phục</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <select>…</select> from <section data-testid="parity-shared-editor">…</section> subtree intercepts pointer events
  - retrying click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <main>…</main> intercepts pointer events
  - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <select>…</select> from <section data-testid="parity-shared-editor">…</section> subtree intercepts pointer events
  2 × retrying click action
      - waiting 100ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div tabindex="0" role="textbox" translate="no" contenteditable="true" aria-haspopup="listbox" aria-autocomplete="list" data-disnote-slot="content" class="tiptap tiptap placeholder-selector-8d3cdb9e-5ee0-4a06-9026-1d778dbdfb8e ProseMirror bn-editor bn-default-styles disnote-editor__content placeholder-selector-d6232d0e-1ae3-4ef0-9786-a53f1623f8ad placeholder-selector-f99ae8bc-9155-4f8c-9817-26b845cf08af">…</div> from <section data-testid="parity-shared-editor">…</section> subtree intercepts pointer events
  27 × retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <main>…</main> intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <select>…</select> from <section data-testid="parity-shared-editor">…</section> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div tabindex="0" role="textbox" translate="no" contenteditable="true" aria-haspopup="listbox" aria-autocomplete="list" data-disnote-slot="content" class="tiptap tiptap placeholder-selector-8d3cdb9e-5ee0-4a06-9026-1d778dbdfb8e ProseMirror bn-editor bn-default-styles disnote-editor__content placeholder-selector-d6232d0e-1ae3-4ef0-9786-a53f1623f8ad placeholder-selector-f99ae8bc-9155-4f8c-9817-26b845cf08af">…</div> from <section data-testid="parity-shared-editor">…</section> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div tabindex="0" role="textbox" translate="no" contenteditable="true" aria-haspopup="listbox" aria-autocomplete="list" data-disnote-slot="content" class="tiptap tiptap placeholder-selector-8d3cdb9e-5ee0-4a06-9026-1d778dbdfb8e ProseMirror bn-editor bn-default-styles disnote-editor__content placeholder-selector-d6232d0e-1ae3-4ef0-9786-a53f1623f8ad placeholder-selector-f99ae8bc-9155-4f8c-9817-26b845cf08af">…</div> from <section data-testid="parity-shared-editor">…</section> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <main>…</main> intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <select>…</select> from <section data-testid="parity-shared-editor">…</section> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- main [ref=e3]:
  - button "en" [ref=e4]
  - generic [ref=e5]:
    - navigation [ref=e6]:
      - button "Bảng" [ref=e7]
      - button "Bảng Kanban" [ref=e8]
      - button "Danh sách" [ref=e9]
      - button "Bộ sưu tập" [ref=e10]
      - button "Lịch" [ref=e11]
      - button "Dòng thời gian" [ref=e12]
      - button "Bản đồ" [ref=e13]
    - region "Tasks" [ref=e14]:
      - generic [ref=e15]:
        - heading "Tasks" [level=3] [ref=e16]
        - generic [ref=e17]: 1 Bản ghi
      - button "Thêm bản ghi" [ref=e18]
      - table [ref=e20]:
        - rowgroup [ref=e21]:
          - row [ref=e22]:
            - columnheader "Tiêu đề" [ref=e23]
            - columnheader "Bảng Kanban" [ref=e24]
            - columnheader "Lịch" [ref=e25]
            - columnheader "Bản ghi" [ref=e26]
        - rowgroup [ref=e27]:
          - row [ref=e28]:
            - cell "First task" [ref=e29]
            - cell "todo" [ref=e30]
            - cell "2026-10-14" [ref=e31]
            - cell [ref=e32]:
              - button "Sửa bản ghi" [ref=e33]
              - button "Xóa" [ref=e34]
      - navigation "Bản ghi" [ref=e35]:
        - button "Trước" [disabled] [ref=e36]
        - generic [ref=e37]: 1–1 / 1
        - button "Sau" [disabled] [ref=e38]
  - complementary "Bình luận" [ref=e40]:
    - heading "Bình luận" [level=3] [ref=e41]
    - generic [ref=e42]:
      - textbox "Thêm bình luận" [ref=e43]
      - button "Thêm bình luận" [disabled] [ref=e44]
  - generic [ref=e45]:
    - button "Đã kết nối" [ref=e46]
    - generic [ref=e47]:
      - status [ref=e48]: Đã lưu mọi thay đổi
      - textbox [ref=e51]:
        - paragraph [ref=e56]: Revision two
  - textbox [ref=e61]:
    - generic [ref=e65]:
      - paragraph [ref=e66]
      - text: Nhập văn bản hoặc gõ '/' để thêm định dạng
  - navigation "Trang" [ref=e68]:
    - button "Thùng rác" [ref=e69]
    - list [ref=e70]:
      - listitem [ref=e71]:
        - button "Owner" [ref=e72]
        - button "Xóa" [ref=e73]
        - combobox "Đường dẫn trang" [ref=e74]:
          - option "Chưa phân nhóm" [selected]
          - option "Consumer"
        - list [ref=e75]:
          - listitem [ref=e76]:
            - button "Consumer" [ref=e77]
            - button "Xóa" [ref=e78]
            - combobox "Đường dẫn trang" [ref=e79]:
              - option "Chưa phân nhóm"
              - option "Owner" [selected]
            - list
    - generic [ref=e80]:
      - textbox "Tiêu đề" [ref=e81]
      - combobox "Nút mẫu" [ref=e82]:
        - option "Chưa phân nhóm" [selected]
      - button "Tạo trang" [disabled] [ref=e83]
  - textbox [ref=e87]:
    - generic [ref=e88]:
      - region "Nội dung đồng bộ" [ref=e95]:
        - generic [ref=e96]:
          - text: Nguồn dùng chung
          - combobox "Nguồn dùng chung" [ref=e97]:
            - option
            - option "parity-source · parity-owner" [selected]
        - paragraph [ref=e99]: Shared seed
        - button "Sửa nội dung dùng chung" [ref=e100]
      - region "Nội dung đồng bộ" [ref=e107]:
        - generic [ref=e108]:
          - text: Nguồn dùng chung
          - combobox "Nguồn dùng chung" [ref=e109]:
            - option
            - option "parity-source · parity-owner" [selected]
        - paragraph [ref=e111]: Shared seed
        - button "Sửa nội dung dùng chung" [ref=e112]
  - generic [ref=e115]:
    - generic [ref=e116]:
      - generic [ref=e117]: Nội dung đồng bộ
      - paragraph [ref=e118]: Shared seed
    - generic [ref=e119]:
      - generic [ref=e120]: Nội dung đồng bộ
      - paragraph [ref=e121]: Shared seed
  - complementary "Lịch sử phiên bản" [ref=e123]:
    - heading "Lịch sử phiên bản" [level=3] [ref=e124]
    - list [ref=e125]:
      - listitem [ref=e126]:
        - button "1 · demo-user · 2026-10-18T16:32:45.229Z" [ref=e127]
        - button "Khôi phục" [ref=e128]
      - listitem [ref=e129]:
        - button "2 · demo-user · 2026-10-18T16:32:45.230Z" [ref=e130]
        - button "Khôi phục" [disabled] [ref=e131]
```

# Test source

```ts
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
  22  |   await row.getByRole("button", { name: "Xóa", exact: true }).click();
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
> 112 |   await first.getByRole("button", { name: "Khôi phục", exact: true }).click();
      |                                                                       ^ Error: locator.click: Test timeout of 60000ms exceeded.
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
  123 |   await expect(offline.locator('[role=status]')).toHaveAttribute("data-pending", "0");
  124 |   await page.reload(); await expect(editable).toContainText("Queued change");
  125 |   await expect(offline.locator('[role=status]')).toHaveAttribute("data-pending", "0");
  126 | });
  127 | 
  128 | test("mobile bridge validates initialization and emits edited document JSON", async ({ page }) => {
  129 |   await page.goto("/mobile-editor");
  130 |   await expect(page.getByTestId("mobile-output")).toContainText('"kind":"ready"');
  131 |   await page.evaluate(() => window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ version: 1, kind: "initialize", editable: true, locale: "vi", document: { format: "disnote-document", schemaVersion: 1, id: "mobile-doc", metadata: { createdAt: "2026-10-14T00:00:00Z", updatedAt: "2026-10-14T00:00:00Z" }, blocks: [{ id: "mobile-block", type: "paragraph", version: 1, props: {}, content: [{ type: "text", text: "Mobile content" }] }] } }) })));
  132 |   const editable = page.locator("[contenteditable=true]").first();
  133 |   await editable.click(); await page.keyboard.press("Control+End"); await page.keyboard.insertText(" Tiếng Việt");
  134 |   await expect(page.getByTestId("mobile-output")).toContainText("Tiếng Việt");
  135 |   await page.evaluate(() => window.dispatchEvent(new MessageEvent("message", { origin: "https://untrusted.example", data: JSON.stringify({ version: 1, kind: "initialize", editable: false, locale: "en", document: {} }) })));
  136 |   await expect(editable).toContainText("Mobile content");
  137 | });
  138 | 
```