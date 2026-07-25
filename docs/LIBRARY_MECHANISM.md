# DisNote Document — Cơ chế chi tiết: cách thư viện được code và cách nó chạy

> Tài liệu này giải thích **cơ chế bên trong** của thư viện `DisNote-Document-Library`:
> nó được thiết kế và viết code như thế nào, từng phần hoạt động ra sao, và khi
> chạy thì dữ liệu đi qua những bước nào. Đọc cùng với `ARCHITECTURE.md` và
> `DOCUMENT_FORMAT_V1.md`.
>
> Phiên bản: 0.1.0 · Đã build & test 68 unit/round-trip/contract test (pass).

---

## 1. Ý tưởng cốt lõi (tại sao lại code như vậy)

Vấn đề gốc: nếu landing page lưu Markdown, Legal Service lưu mảng paragraph,
workspace lưu BlockNote JSON → ba định dạng không tương thích, không tái sử dụng
được renderer, migration hỗn loạn, bị khóa vào vendor.

Giải pháp: **một hợp đồng dữ liệu duy nhất** tên là `DisNoteDocument` (JSON
thuần), sở hữu bởi DisNote — không phải type của bất kỳ vendor nào. Mọi thứ khác
(editor, renderer, storage, collaboration) chỉ là lớp bao quanh hợp đồng đó.

Ba nguyên tắc chi phối toàn bộ code:

1. **Hướng phụ thuộc một chiều.** Mọi package đều trỏ về `document-core`;
   `document-core` không import gì cả (không React, không DOM, không database,
   không BlockNote). Điều này được *ép buộc* bằng ESLint (`.eslintrc.cjs`) và
   bằng TypeScript project references.
2. **Validate tại biên (boundary).** Dữ liệu từ DB, API, import, plugin, editor
   đều không tin được → luôn chạy qua `validateDocument` trước khi tin.
3. **Bất biến (immutable).** Mọi phép biến đổi tài liệu trả về object mới, không
   sửa input. Nhờ đó test data-loss dễ, undo/redo và revision an toàn.

---

## 2. Bản đồ package và vai trò

| Package | Vai trò | Phụ thuộc | Verify offline |
|---|---|---|---|
| `@disnote/document-core` | Model, validation, migration, transformations, serialization | (không) | ✅ build + test |
| `@disnote/renderer-html` | Render HTML/SSR an toàn | core | ✅ |
| `@disnote/renderer-react` | `<DocumentRenderer>` | core, React | ✅ test SSR runtime |
| `@disnote/renderer-native` | Projection cho React Native | core | ✅ |
| `@disnote/editor-blocknote` | Adapter BlockNote + `<DisNoteEditor>` + i18n + slash | core, (React/BlockNote peer) | ✅ adapter+i18n; facade cần deps |
| `@disnote/storage-contracts` | Contract repository + in-memory impl | core | ✅ |
| `@disnote/import-export` | Markdown/HTML import-export (lossy) | core | ✅ |
| `@disnote/assets` | Kiểm tra upload (MIME + magic bytes) | storage-contracts | ✅ |
| `@disnote/comments` | Comment threads, mention/reference providers | core | ✅ |
| `@disnote/search-ai` | Search projection + pipeline AI operations | core | ✅ |
| `@disnote/legal-content` | Lớp application/domain cho Legal Service | core, storage-contracts | ✅ |
| `@disnote/collaboration-yjs` | Update log/compaction/snapshot→revision + Yjs binding | core, (Yjs peer) | ✅ core; binding cần Yjs |
| `@disnote/document-testing` | Fixtures, factories, assertions, contract suite | core, storage-contracts | ✅ |
| `presets/*` | `article`, `legal`, `workspace` | core | ✅ |

"Verify offline" = mình đã build bằng `tsc` và chạy test thật trong môi trường
này. Phần cần React/BlockNote/NestJS/Yjs được viết code đầy đủ nhưng build/chạy
trên máy bạn (sau `npm install`).

---

## 3. Tài liệu được biểu diễn như thế nào (DisNote Document Format V1)

Một tài liệu là một *envelope* bọc metadata và một *cây block*:

```ts
interface DisNoteDocument {
  format: "disnote-document";  // hằng số, KHÔNG bao giờ là type vendor
  schemaVersion: number;       // V1 = 1
  id: string;
  blocks: DisNoteBlock[];
  metadata: DocumentMetadata;  // title, description, locale, createdAt/updatedAt, attributes…
}

interface DisNoteBlock {
  id: string;                        // ổn định suốt vòng đời block
  type: string;                      // "paragraph", "heading", "consumer.acme.card"…
  version: number;                   // version của riêng block
  props: Record<string, JsonValue>;  // luôn tồn tại
  content?: DisNoteInline[];         // text/link/mention/reference
  children?: DisNoteBlock[];         // block lồng nhau
}
```

Điểm mấu chốt về cơ chế: **persisted document chỉ chứa giá trị JSON-safe.** File
`model/json.ts` có hàm `isJsonValue()` từ chối function, class instance, `Date`,
`Map`/`Set`, React element, DOM node, Blob… (phát hiện bằng cách kiểm tra
prototype khác `Object.prototype`). Date luôn lưu dạng ISO-8601 string. Nhờ vậy
tài liệu có thể serialize/deserialize/checksum một cách xác định (deterministic).

Inline content có 4 loại: `text` (kèm `marks[]`), `link`, `mention`,
`reference`. Marks gồm bold/italic/underline/strike/code/textColor/
backgroundColor. `reference` chính là "connected context" đặc trưng của DisNote:
lưu ID làm nguồn sự thật, `label`/`snapshot` chỉ là fallback hiển thị.

---

## 4. `document-core` — trái tim thuần TypeScript

Đây là package quan trọng nhất. Không import gì bên ngoài, nên test được hoàn
toàn không cần browser/DB.

### 4.1 model + builders + ids

`model/` định nghĩa type và các *builder* tiện dụng (`paragraph()`, `heading()`,
`text()`, `callout()`, `createDocument()`…). Builder giúp viết tài liệu bằng code
dễ đọc:

```ts
let doc = createDocument({ metadata: { title: "Hello" } });
doc = appendBlock(doc, heading(1, [text("Xin chào")])).document;
```

`model/ids.ts` sinh ID ổn định (dùng `crypto.randomUUID` nếu có, fallback tự
viết). Có `setIdGenerator()` để test sinh ID xác định. Nguyên tắc: **không bao
giờ dùng array index làm ID**; move block không đổi ID; clone thì sinh ID mới.

### 4.2 registry — điểm mở rộng trung tâm (Open/Closed)

`registry/` cho phép **thêm block mà không sửa core**. Mỗi block có một
`CoreBlockDefinition`:

```ts
interface CoreBlockDefinition<Props> {
  type: string; version: number; capabilities: BlockCapabilities;
  validateProps(input: unknown): ValidationResult<Props>;
  migrate(block: DisNoteBlock): DisNoteBlock;
  toPlainText(block: TypedBlock<Props>): string;
}
```

`createBlockRegistry()` trả về registry *bất biến*: `register()` tạo ra registry
mới (Map copy) chứ không mutate — nên chia sẻ registry giữa các preset an toàn.
10 block V1 (`paragraph`, `heading`, `bulletListItem`, `numberedListItem`,
`checklistItem`, `quote`, `codeBlock`, `image`, `divider`, `callout`) nằm trong
`registry/core-blocks.ts`. Renderer/editor được compose ở package riêng để core
không phải import React.

### 4.3 validation — cơ chế "validate tại biên"

`validation/validateDocument(input, options)` nhận `unknown` và trả về
`{ ok: true, value } | { ok: false, issues }`. Nó kiểm tra:

- envelope: `format`, `schemaVersion`, `id`, `metadata.createdAt/updatedAt`.
- từng block: `id` không rỗng & **không trùng** (dò `duplicate-id`), `type` không
  rỗng, `version` là số nguyên dương, `props` là object JSON-safe.
- **cycle**: dùng `WeakSet` các reference đã thăm để phát hiện chu trình (tránh
  vòng lặp vô hạn nếu ai đó truyền object graph có vòng).
- inline: link có scheme an toàn không (`javascript:`/`vbscript:`/`file:`/`data:`
  bị đánh dấu `unsafe-url`), mark hợp lệ không.
- nếu truyền `registry`: gọi `validateProps` cho block đã biết. **Block lạ được
  giữ nguyên** (chỉ báo lỗi khi bật `strictUnknownBlocks`).

Đây là cơ chế bảo mật tuyến đầu: mọi dữ liệu vào hệ thống đều đi qua đây.

### 4.4 traversal — duyệt cây O(n)

`visitBlocks(document, visitor)` duyệt depth-first pre-order, cung cấp
`{ block, parent, index, depth }`. Trên đó xây `findBlock`, `collectBlockIds`,
`maxDepth`, `findDuplicateIds`. Tất cả O(n).

### 4.5 transformations — bất biến + structural sharing

`insertBlock`, `appendBlock`, `updateBlock`, `replaceBlock`, `removeBlock`,
`moveBlock`, `wrapBlocks`, `mapBlocks`. Mỗi hàm trả về `TransformResult`:

```ts
type TransformResult =
  | { ok: true; document: DisNoteDocument; changedBlockIds: string[] }
  | { ok: false; error: DocumentTransformError };
```

Cơ chế: các hàm đệ quy tạo **mảng/object mới chỉ ở nhánh thay đổi**, các nhánh
không đổi được dùng lại (structural sharing) → nhanh mà vẫn bất biến. Test
`expect(before).toEqual(snapshot)` chứng minh input không bị mutate. Lỗi nghiệp
vụ (block không tồn tại) trả về `ok:false` chứ **không throw** — dễ xử lý ở UI.

Lưu ý: đây là *command cấp core*, khác *transaction cấp editor*. Core không quản
lý selection/DOM/clipboard/undo — đó là việc của BlockNote/ProseMirror.

### 4.6 serialization — canonical JSON, checksum, plain-text

- `canonicalJson(value)` sắp xếp key theo thứ tự từ điển ở mọi cấp → hai tài liệu
  giống nhau về ngữ nghĩa luôn cho **cùng một chuỗi**.
- `checksum(document)` = SHA-256 của canonical JSON. SHA-256 được **tự viết
  thuần JS** (`serialization/sha256.ts`) để core không phụ thuộc Node crypto,
  chạy được ở mọi môi trường JS. Checksum dùng để: chống lưu trùng, cache
  renderer, audit, kiểm tra migration.
- `extractDocumentPlainText(document, registry?)` và `extractHeadings()` tạo
  projection cho search/SEO — **sinh từ registry, không parse output React**.

### 4.7 migrations — ba trục version độc lập

```
library:  @disnote/document-core@0.1.0
document: schemaVersion = 1
block:    callout@1
```

`createMigrationRegistry()`:

```ts
const m = createMigrationRegistry()
  .registerDocumentMigration(0, 1, migrateV0toV1)   // mỗi bước đúng 1 version
  .registerBlockMigration("callout", 1, 2, up);
```

`migrate(document)` chạy migration cấp document từng bước tới version đích, rồi
duyệt mọi block và áp block-migration cho tới khi không còn migration nào cho
`type@version`. Trả về `report` gồm `documentSteps`, `blockSteps`,
`changedBlockIds`. Có `dryRun()` để xem trước mà không thực thi. Quy tắc:
deterministic, không network, không phụ thuộc user, idempotent tại đích, lỗi
không mutate nguồn.

---

## 5. Renderers — hiển thị mà không cần editor

### 5.1 renderer-html (SSR an toàn)

`renderDocumentToHtml({ document, registry, policy })` trả về
`{ html, plainText, headings, assets, warnings }`. Cơ chế:

- **Escape mặc định**: mọi text qua `escapeHtml()` (`& < > " '`).
- **Sanitize URL**: `safeHref()` chỉ cho `https:`/`mailto:` (và `http:` nếu bật
  dev); scheme nguy hiểm → bỏ link + thêm warning. Màu chỉ nhận token an toàn.
- **Gom list**: các `bulletListItem` liên tiếp gộp thành `<ul>`, numbered thành
  `<ol>` (vì model lưu từng item riêng kiểu BlockNote).
- **Unknown block**: render fallback trơ `<div class="disnote-unknown-block">`
  — **không bao giờ âm thầm biến thành paragraph**, không thực thi gì.

Trang đọc (landing) **không tải bundle editor** — đây là điểm mấu chốt cho SEO
và tốc độ.

### 5.2 renderer-react (`<DocumentRenderer>`)

Dùng React Context (`DocumentRenderContext`) mang `registry`, `theme`,
`referenceResolver`, `assetResolver`. `BlockList` gom list, `BlockRenderer`
dispatch theo `type`, `InlineRenderer` render text/mark/link/mention/reference,
`UnknownBlock` là fallback. Reference resolver trả `resolved`/`forbidden`/
`missing` — nên preview không lộ metadata nhạy cảm. Component này **không mount
editor**. Đã verify bằng `renderToStaticMarkup` thật.

### 5.3 renderer-native

Scaffold: `projectForNative(document)` làm phẳng tài liệu thành text runs (không
DOM, không HTML) để màn hình RN đọc sớm; component RN đầy đủ để sau.

---

## 6. Editor — BlockNote là adapter đầu tiên, không phải giới hạn

### 6.1 Adapter thuần (không lộ vendor)

`editor-blocknote/src/adapter/` là **thuần TS, không import BlockNote** — nhờ đó
test round-trip không cần browser. Cơ chế:

- `blocknote-shape.ts`: định nghĩa *bản sao cấu trúc* của document BlockNote
  (`BnBlock`, `BnStyledText`…). Ta không import type của BlockNote để không biến
  nó thành hợp đồng public.
- `convert.ts`: `blockToBn` / `blockFromBn`, `inlineToBn` / `inlineFromBn`. Map
  marks ↔ styles theo **thứ tự canonical** để round-trip xác định. `codeBlock`
  được xử lý riêng (DisNote lưu code trong `props`, BlockNote lưu trong
  `content`). Version của block được mang qua BlockNote bằng prop dành riêng
  `__disnoteVersion` rồi **strip khi quay về** → không rò rỉ vào tài liệu DisNote.
- `adapter.ts`: `createBlockNoteAdapter()` trả về `EditorAdapter` với
  `toEditor` / `fromEditor` / `validateRoundTrip`.

**Bất biến round-trip** (được test cho mọi block V1 + block custom):

```
DisNoteDocument A → toEditor → fromEditor → DisNoteDocument B
```

A và B phải tương đương ngữ nghĩa: không mất block/id/marks/props/children, không
đổi thứ tự. `validateRoundTrip` chuẩn hóa (content/children mặc định) rồi so sánh
canonical JSON. Đây là "lưới an toàn" khi nâng cấp BlockNote: nâng editor **không
được** đổi dữ liệu persisted.

### 6.2 Facade `<DisNoteEditor>` (subpath `./react`)

Component công khai *không expose* object editor của BlockNote. Handle ổn định:

```ts
interface DisNoteEditorHandle {
  focus(): void; getDocument(): DisNoteDocument;
  insertBlock(block): void; setEditable(editable): void;
}
```

Nếu cần tích hợp nâng cao, có "escape hatch" `ExperimentalEditorAccess` (không
bảo đảm tương thích). Facade build riêng bằng `tsconfig.react.json` (cần
BlockNote + React) nên consumer chỉ-đọc không kéo bundle editor.

### 6.3 UI phụ trợ

`i18n/dictionary.ts` (en + vi, key nguyên câu — **không nối fragment dịch**),
`slash-menu/commands.ts` (registry lệnh + `filterSlashCommands`, thuần & test
được, hỗ trợ từ khóa tiếng Việt). Các component React (`Toolbar`, `LinkEditor`,
`ImageUploadButton`, `SlashMenu`) dùng button thật, có accessible name, listbox
roving focus, `LinkEditor` từ chối URL nguy hiểm, `ImageUploadButton` phụ thuộc
`UploadProvider` (DIP) chứ không phụ thuộc backend cụ thể.

---

## 7. Storage — hợp đồng tách theo capability (Interface Segregation)

`storage-contracts` tách nhỏ: `DocumentReader`, `DraftWriter`,
`DocumentPublisher`, `RevisionReader`, `AssetUploader`. Consumer chỉ phụ thuộc
cái nó cần.

`InMemoryDocumentRepository` là bản tham chiếu, thực thi đủ ba cơ chế quan trọng:

- **Optimistic concurrency**: `saveDraft` yêu cầu `expectedRevision`; nếu khác
  `currentRevision` → trả `revision-conflict` (không ghi đè âm thầm).
- **Idempotency**: cùng `idempotencyKey` → trả cùng revision, không tạo bản trùng.
- **Published revision bất biến**: publish trỏ `publishedRevision`; sửa draft
  tạo revision mới, landing vẫn đọc revision đã publish cho tới khi publish bản
  mới. Archive → không phục vụ public nữa.

Contract này được đóng gói thành **bộ test tái sử dụng**
(`document-testing`/`runDocumentRepositoryContract`) để chạy y hệt cho in-memory,
Mongo, HTTP.

---

## 8. Các capability tùy chọn

### 8.1 import-export (Markdown/HTML)

Canonical là DisNote JSON; Markdown/HTML là định dạng trao đổi **có mất mát**.
`exportMarkdownLossy(document)` trả `{ output, warnings }` — warning liệt kê thứ
bị mất (callout→blockquote, mention→text, underline/color bị bỏ…).
`importMarkdown` / `importHtml` parse subset được hỗ trợ, **sanitize** URL nguy
hiểm. Export HTML an toàn thì dùng `renderer-html`.

### 8.2 assets (bảo mật upload)

`InMemoryAssetUploader.upload()` thực thi đúng quy tắc mục 21: allowlist MIME →
**kiểm tra magic bytes ở server** (`detectMimeType`: PNG/JPEG/GIF/WEBP/PDF) →
giới hạn size → **key lưu trữ ngẫu nhiên, không dùng filename làm path**. Nếu MIME
khai báo ≠ nội dung thật → từ chối (`mime-mismatch`).

### 8.3 comments + mentions + references

Comment **không nằm trong content**. `InMemoryCommentStore` lưu thread riêng với
`anchor` (document/block/inline-range). Khi block bị xóa, `reconcile(document)`
đánh dấu thread thành **orphaned** nhưng **không xóa**. `InMemoryMentionProvider`
minh họa provider mà core không tự gọi User Service.

### 8.4 search-ai

`buildSearchProjection(document, registry, revision)` tạo projection (title,
plainText, headings, references, assets, locale) **từ registry**. Pipeline AI an
toàn: `validateOperations` (mọi op tham chiếu block ID hợp lệ) →
`applyOperations` (áp tuần tự bằng transformations, **abort nếu 1 op lỗi**, không
commit dở) → `previewDiff` (added/removed/changed theo checksum từng block) để
người dùng xác nhận trước khi tạo revision. AI **không sửa trực tiếp** tài liệu.

---

## 9. Legal Service (M9) + Landing (M10)

`legal-content` là **lớp application/domain thuần** (không NestJS/Mongo):
`ContentApplicationService` điều phối use case (createDraft, saveDraft, publish,
unpublish, archive, getPublished, listRevisions), **validate tại biên** và
**migrate khi đọc**. Domain policy: legal document phải có `effectiveDate` trong
`metadata.attributes` mới publish được; không sửa được document đã archive; mọi
hành động ghi `AuditEvent`.

`examples/legal-service-nest/` cho thấy cách bọc NestJS: controller chỉ là biên
HTTP, `MongoDocumentRepository` hiện thực `ContentStore` với **collection tách
rời** (`content_documents`, `content_document_revisions`) — không nhúng toàn bộ
lịch sử revision vào một document.

`examples/nextjs-demo/` là landing: server component fetch published revision →
validate → migrate → `renderer-html` → metadata → cache theo revision, kèm
`sitemap.ts` và route `revalidate`. Trang đọc không tải editor.

---

## 10. Collaboration (M13) — chỉ sau khi single-user ổn định

`collaboration-yjs` tách làm hai:

- **Lõi CRDT-agnostic (test được)**: `InMemoryUpdateStore` = update log +
  **compaction** (khi số update đạt ngưỡng, gộp thành snapshot rồi xóa log — mô
  phỏng `document_collab_updates`/`document_collab_snapshots`).
  `snapshotToRevision(document, registry)` biến snapshot ổn định thành **revision
  bất biến đã validate** — **presence không bao giờ vào revision**.
- **Binding Yjs (cần peer `yjs`)**: `src/yjs/binding.ts` map DisNoteDocument ↔
  `Y.Array<Y.Map>`, `encodeStateAsUpdate` / `applyUpdate`, và materialize snapshot
  để publish. Build riêng bằng `tsconfig.yjs.json`.

Publish trong chế độ collab: `Yjs state → snapshot ổn định → DisNoteDocument →
validate → revision bất biến → publish`.

---

## 11. Cách nó "chạy" — các luồng dữ liệu

**Sửa (edit):**

```
API document → validate → migrate → DisNoteDocument
  → toEditor → (BlockNote sửa) → fromEditor → validate
  → saveDraft(expectedRevision) → revision mới
```

**Đọc/Render:**

```
Published document → validate → migrate → resolve block definitions
  → renderer-react / renderer-html / native
```

**Publish:**

```
draft revision N → publish → publishedRevision = N (bất biến)
  landing đọc revision N cho tới khi publish bản mới
```

**Migration khi đọc:** `load → validate envelope → migrate in-memory → render`.
Migration DB chạy job nền, tạo revision `source:"migration"`, có dry-run + report.

**AI:** `AI đề xuất ops → validateOperations → applyOperations → previewDiff →
người dùng xác nhận → tạo revision`.

**Collab:** `Editor A/B → update → update log → compaction → snapshot → revision`.

---

## 12. Cách build, test, chạy (cơ chế monorepo)

Đây là **npm workspaces monorepo** (`packages/*`, `presets/*`, `examples/*`).

Cơ chế liên kết giữa package:

- **package exports map**: mỗi package chỉ export từ `dist/index.js` (public API
  boundary) — consumer không import đường dẫn nội bộ.
- **TypeScript project references**: `tsconfig.json` gốc tham chiếu mọi package
  theo đúng thứ tự phụ thuộc; `tsc -b` build tăng dần (incremental).
- **peerDependencies**: React/BlockNote/Yjs khai báo là peer (+ optional) để
  consumer chia sẻ instance, không bị bundle trùng.

Lệnh:

```bash
npm install          # cài deps (React, BlockNote, @types/node, tsx…)
npm run typecheck    # tsc -b toàn bộ project references
npm test             # tsx --tsconfig tsconfig.test.json --test "packages/**/*.test.ts" …
npm run build        # tsc -b → sinh dist (ESM + .d.ts + source map)
node scripts/benchmark.mjs   # đo hiệu năng 1k/5k/10k block
npm run storybook    # (cần @storybook/react-vite)
```

**Test runner**: dùng test runner sẵn có của Node (`node:test`) chạy qua `tsx`
(transpile TS/TSX on-the-fly, JSX automatic runtime qua `tsconfig.test.json`).
Không cần Jest/Vitest. Mỗi test file là `*.test.ts(x)` cạnh code.

**Build output** mỗi package: ESM, type declarations, source maps, export map
rõ ràng, tree-shakable (`sideEffects:false`).

Một số phần build riêng (vì cần peer deps): facade editor
(`editor-blocknote/tsconfig.react.json`), Yjs binding
(`collaboration-yjs/tsconfig.yjs.json`).

---

## 13. Nguyên tắc code được áp dụng (SOLID + patterns)

- **S** — mỗi package/class một lý do thay đổi: `DocumentValidator`,
  `DocumentMigrator`, `ReactDocumentRenderer`, `MongoDocumentRepository`… Không
  có `DocumentService` biết-tuốt.
- **O** — thêm block qua **registry**, không sửa switch ở 5 package.
- **L** — mọi implementation của `DocumentRepository` thay thế được nhau; **cùng
  một contract test** chạy cho tất cả.
- **I** — tách `Reader`/`DraftWriter`/`Publisher`/`Uploader`/`CollaborationProvider`.
- **D** — workflow cấp cao phụ thuộc interface; app truyền implementation vào.
  Ví dụ `ContentApplicationService` phụ thuộc `ContentStore`, không phụ thuộc Mongo.

Patterns lặp lại: **Result type** (`{ok:true,…} | {ok:false,…}`) thay vì throw
cho lỗi nghiệp vụ; **registry dispatch** thay cho switch toàn cục;
**immutability + structural sharing**; **boundary validation**; **side-channel
prop** (`__disnoteVersion`) để round-trip không mất version.

Anti-patterns bị tránh (mục 36 guideline): không lưu editor instance/HTML/
Markdown làm nguồn sự thật; core không gọi API; component không gọi Mongo/HTTP
trực tiếp; unknown block không âm thầm thành paragraph; không thêm realtime
trước khi revision ổn định.

---

## 14. Trạng thái kiểm chứng

- **68 test** pass: core (validation, transformations bất biến, serialization,
  migration, performance 1k block, XSS), renderer HTML + React (SSR thật),
  adapter round-trip (mọi block V1 + custom), storage (concurrency/idempotency/
  immutable) + contract suite tái sử dụng, import/export, assets (magic bytes),
  comments (orphan), search-ai (validate/apply/diff), legal-content (publish/
  effective-date/audit), collaboration (compaction/snapshot), editor i18n/slash,
  editor-engine-lab.
- Build sạch bằng `tsc` (strict) cho toàn bộ đồ thị không cần deps ngoài.
- Phần cần deps ngoài (facade `<DisNoteEditor>`, Yjs binding, NestJS controllers,
  Next.js pages, Storybook) được **viết code đầy đủ** và sẽ build/chạy trên máy
  bạn sau `npm install`.

Muốn xác minh lại: `npm install && npm run typecheck && npm test && npm run build`.
