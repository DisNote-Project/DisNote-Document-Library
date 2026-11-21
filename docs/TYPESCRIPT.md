# Hướng dẫn TypeScript: React, React Native và backend Node.js

Đọc [kiến trúc](ARCHITECTURE.md) để hiểu định dạng chung; [Go](GO_BACKEND.md) và [Flutter](FLUTTER.md) mô tả các SDK khác. Các ví dụ dùng API trong checkout ngày 20/11/2026. Giá trị tiêu đề, ID và URL trong ví dụ là dữ liệu minh họa; khi tích hợp DisNote, đưa nhãn UI vào i18n và cấu hình kỹ thuật vào constants.

**Bắt đầu từ đâu:** mục 1–3 giúp chạy editor; mục 13 thực hành toàn bộ vòng đời dữ liệu; mục 14 nối database; mục 15–17 hướng dẫn custom block/renderer/editor; mục 18 xử lý migration. Mỗi code block có tên file là một phần của ví dụ nhiều file; đặt chung trong thư mục ví dụ như hướng dẫn, không ghép các import trùng vào một file.

## 1. Chọn package và cách cài

| Nhu cầu | Package/import |
|---|---|
| Model, validation, builders, backend | `@disnote/core` |
| React editor tiện dụng | `@disnote/react` |
| React chỉ đọc, tránh editor runtime | `@disnote/core/react/view` |
| HTML/SSR | `@disnote/core/renderer/html` |
| React Native reader | `@disnote/core/renderer/native` |
| React Native editor bridge | `@disnote/core/mobile` |
| Standalone workbook | `@disnote/sheets` |

Manifest hiện tại: core `0.7.0`, React `0.1.0`, sheets `0.1.0`. Root là private. Node tối thiểu theo manifest là `20.19`; React peer là `18.3` hoặc `19`. Đây không phải xác nhận các phiên bản đã có trên npm.

Nếu phiên bản tương ứng đã được phát hành:

```bash
npm install @disnote/core
# Thêm nếu ứng dụng cần editor React:
npm install @disnote/react
# Thêm nếu cần engine bảng tính:
npm install @disnote/sheets
```

Làm việc trực tiếp trong repository:

```bash
npm ci
npm run build
```

Nếu registry chưa có bản mới, dùng archive local thay vì để npm lấy một phiên bản cũ:

```bash
# Chạy ở repository thư viện; tạo trước thư mục ../consumer/vendor.
npm run build
npm pack --workspace @disnote/core --pack-destination ../consumer/vendor
npm pack --workspace @disnote/react --pack-destination ../consumer/vendor
# Chạy ở consumer; dùng đúng tên archive do npm pack trả về.
npm install ./vendor/disnote-core-0.7.0.tgz ./vendor/disnote-react-0.1.0.tgz
```

Giữ core và React package tương thích trong cùng lần cài. React facade kéo theo editor dependencies; ứng dụng backend hoặc reader không cần cài facade này.

## 2. Tạo, kiểm tra và serialize document

```ts
import {
  createDocument, heading, paragraph, text, validateDocument,
  createDefaultRegistry, checksum,
} from '@disnote/core';

const registry = createDefaultRegistry();
const document = createDocument({
  metadata: { title: 'Tài liệu mẫu', locale: 'vi' },
  blocks: [
    heading(1, [text('Giới thiệu')]),
    paragraph([text('Nội dung đầu tiên')]),
  ],
});

const checked = validateDocument(document, {
  registry,
  strictUnknownBlocks: true,
});
if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
const json = JSON.stringify(checked.value);
const digest = checksum(checked.value);
```

Khi nhận HTTP/import: parse vào `unknown`, gọi `validateDocument`, chỉ dùng `value` sau khi `ok`. Type assertion `as DisNoteDocument` không thay validation. `JSON.stringify` phục vụ truyền/lưu; dùng API canonical/checksum khi cần so sánh xuyên runtime.

## 3. React: editor tối thiểu

```tsx
import { useState } from 'react';
import { DocumentEditor } from '@disnote/react';
import { DocumentView } from '@disnote/core/react/view';
import { createDocument, type DisNoteDocument } from '@disnote/core';
import '@disnote/react/styles.css';

export function DocumentScreen() {
  const [initial] = useState(() => createDocument());
  const [draft, setDraft] = useState<DisNoteDocument>(initial);
  return (
    <>
      <DocumentEditor
        key={initial.id}
        initialDocument={initial}
        locale="vi"
        onChange={setDraft}
      />
      <DocumentView document={draft} />
    </>
  );
}
```

Ví dụ này cập nhật draft và preview trong bộ nhớ. Để lưu bền vững, hook ứng dụng phải gửi draft đến backend, quản lý revision, retry và trạng thái lỗi.

`DocumentEditor` là uncontrolled: `initialDocument` được lấy lúc mount. Khi chuyển document hoặc chủ động thay toàn bộ bản đang chỉnh sửa, dùng `key` mới phù hợp với document/reset generation. Không dùng revision tăng sau mỗi autosave làm key vì sẽ remount và mất selection.

### API quan trọng

| Prop/API | Ý nghĩa |
|---|---|
| `initialDocument` | Document khởi tạo; facade có thể tự tạo document trống |
| `onChange(document)` | Callback canonical document trên `DocumentEditor` |
| `editable` | Chế độ UI có cho sửa hay không |
| `locale` | `vi` hoặc `en` |
| `messages` | Override một phần catalog editor |
| `theme` | `light` hoặc `dark` |
| `className`, `style` | CSS của instance và typed `--disnote-*` variables |
| `chrome` | Các switch formattingToolbar, sideMenu, linkToolbar, slashMenu |
| `insertCommands` | Command chèn canonical block theo hợp đồng editor |
| `onCommentAnchorChange` | Anchor cho comment provider |
| `collaboration` | Yjs options do host quản lý |
| `ref.focus()` | Focus editor |
| `ref.getDocument()` | Lấy snapshot hiện tại |
| `ref.insertBlock(block)` | Chèn canonical block |
| `ref.setEditable(value)` | Cập nhật chế độ UI |

API cấp thấp `DisNoteEditor` từ `@disnote/core/editor/react` dùng `onDocumentChange`, không phải `onChange`, và yêu cầu `initialDocument`. `getExperimentalAccess()` là escape hatch vendor-specific, không phải hợp đồng ổn định.

### Reader, CSS và SSR

Ứng dụng chỉ đọc nên import `DocumentView` từ `@disnote/core/react/view`, import CSS tùy nhu cầu. Không import barrel editor chỉ để hiển thị published content.

```tsx
<DocumentEditor
  initialDocument={document}
  locale="vi"
  theme="dark"
  style={{ '--disnote-radius': '12px', '--disnote-font-size': '16px' }}
/>
```

CSS là tùy chọn, scoped theo surface. Dùng tokens công khai thay selector nội bộ của BlockNote. Với Next.js, đặt editor trong client component; render HTML trên server bằng renderer HTML nếu cần SSR không có editor.

## 4. React Native: reader thực sự native

`DocumentNativeRenderer` không tự import `react-native`. Host cung cấp `View`, `Text`, `Image` qua `NativeRendererPrimitives` và adapter nếu type/ref của native components khác interface.

```tsx
import { View, Text, Image } from 'react-native';
import {
  DocumentNativeRenderer,
  type NativeRendererPrimitives,
} from '@disnote/core/renderer/native';
import type { DisNoteDocument } from '@disnote/core';

// Composition boundary: kiểm tra adapter props trên React Native đang sử dụng.
const primitives: NativeRendererPrimitives = {
  View: View as unknown as NativeRendererPrimitives['View'],
  Text: Text as unknown as NativeRendererPrimitives['Text'],
  Image: Image as unknown as NativeRendererPrimitives['Image'],
};

export function NativeReader({ document }: { document: DisNoteDocument }) {
  return <DocumentNativeRenderer document={document} locale="vi"
    primitives={primitives} />;
}
```

Type cast ở ranh giới không chứng minh runtime tương thích; nếu host cần chuyển style/props, viết wrapper có kiểm tra riêng. Dùng `blockRenderers` cho custom blocks, `assetResolver` để resolve asset ID. `projectForNative(document)` trả text runs cho preview/search/accessibility.

Native renderer là projection: link hiện có render text, math/diagram có thể hiện source, không phải mọi block đều có tương tác như web. Không import CSS web hay editor DOM vào native tree.

## 5. React Native: chỉnh sửa qua WebView

1. Host cài và cấu hình `react-native-webview` trong ứng dụng native.
2. Triển khai trang HTTPS chứa `MobileEditorBridge` từ `@disnote/core/editor/react`.
3. Tạo adapter cho WebView implement `NativeWebViewProps`: `ref`, `injectJavaScript`, `onMessage`, source và navigation callback.
4. Truyền adapter đó vào `NativeDocumentEditor` từ `@disnote/core/mobile`.

```tsx
// WebViewAdapter là component do ứng dụng cung cấp theo NativeWebViewProps.
<NativeDocumentEditor
  WebView={WebViewAdapter}
  uri={EDITOR_URL}
  document={document}
  locale="vi"
  editable={permissions.write}
  onDocumentChange={acceptDraft}
  onError={reportBridgeError}
/>
```

Adapter hiện tại chỉ cho navigation tới URL editor đã cấu hình. Dùng URL HTTPS cuối cùng, tránh redirect. Không truyền token trong query string. Khi thay document hoàn toàn, remount theo document ID để bắt đầu handshake mới. Kiểm chứng bàn phím/IME, selection, upload, rotate và background trên thiết bị thật.

Trang editor dùng ví dụ triển khai bridge trong [Flutter](FLUTTER.md#4-trang-react-editor-dùng-chung). Protocol được dùng chung; native host không phải tự viết lại editor engine.

## 6. Backend Node.js/NestJS

### Phân chia trách nhiệm

Controller parse DTO, xác thực request và trả HTTP. Application service kiểm tra policy và điều phối revision. Repository được inject qua token/interface. Không để controller khởi tạo connection hay để UI gọi trực tiếp database.

Repository TypeScript kiểm tra dữ liệu/CAS nhưng không tự xác thực actor. Trước **mọi** read/write/history/publish, service phải kiểm tra actor, tenant/workspace, quyền hiện tại và document identity.

### Repository trong bộ nhớ để thử tích hợp

```ts
import { createDocument, createDefaultRegistry } from '@disnote/core';
import { InMemoryDocumentRepository } from '@disnote/core/storage';

const repository = new InMemoryDocumentRepository({
  registry: createDefaultRegistry(),
});
const document = createDocument();
const stored = await repository.create({
  document, actor: 'trusted-user-id', slug: document.id,
  locale: 'vi', kind: 'ARTICLE', title: 'Ví dụ',
});
const saved = await repository.saveDraft({
  documentId: document.id, document,
  expectedRevision: stored.currentRevision,
  actor: 'trusted-user-id', idempotencyKey: crypto.randomUUID(),
});
if (!saved.ok) {
  // revision-conflict: giữ local draft, lấy revision mới và để người dùng chọn.
  // not-found: trả lỗi tương ứng; không tự tạo lại tài liệu.
}
```

`InMemoryDocumentRepository` dành cho demo/test, mất dữ liệu khi process kết thúc. `DocumentRepository` chia thành reader, draft writer, publisher và revision reader; inject interface nhỏ nhất mà service cần.

### MongoDB hoặc PostgreSQL

```ts
import { createMongoDocumentRepository } from '@disnote/core/persistence/mongodb';
import { createPostgresDocumentRepository } from '@disnote/core/persistence/postgres';

// collection, pool và registry được composition root cung cấp.
const mongoStore = createMongoDocumentRepository({ collection, registry });
await mongoStore.states.initialize();
const documentsOnMongo = mongoStore.documents;

const postgresStore = createPostgresDocumentRepository({ sql: pool, registry });
await postgresStore.states.initialize();
const documentsOnPostgres = postgresStore.documents;
```

Hai đoạn là hai lựa chọn thay thế. Mongo collection phải đáp ứng structural port; PostgreSQL cần executor tương thích `query`. Host sở hữu driver, connection pool, migrations, credentials, timeout và lifecycle. Adapter khởi tạo uniqueness ID và slug/locale, cập nhật bằng store CAS. Không tự bỏ index để xử lý conflict.

### Đưa repository vào NestJS

Trong module host, đăng ký provider dưới token `DOCUMENT_REPOSITORY`; factory nhận database port/registry đã được cấu hình và trả `documents` của một trong hai adapter trên. Ví dụ service phụ thuộc interface và policy riêng của host:

```ts
import { Inject, Injectable } from '@nestjs/common';
import type { DocumentRepository, SaveDraftInput } from '@disnote/core/storage';

export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');
export const DOCUMENT_POLICY = Symbol('DOCUMENT_POLICY');

interface DocumentWritePolicy {
  assertWrite(actor: string, documentId: string): Promise<void>;
}

@Injectable()
export class DocumentApplicationService {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepository,
    @Inject(DOCUMENT_POLICY) private readonly policy: DocumentWritePolicy,
  ) {}

  async saveDraft(input: SaveDraftInput) {
    await this.policy.assertWrite(input.actor, input.documentId);
    return this.documents.saveDraft(input);
  }
}
```

Controller lấy actor từ guard/session đã verify, validate DTO và gọi application service. Provider policy triển khai kiểm tra membership/permission hiện tại. Không bind token policy sang allow-all; không nhận `actor` từ body công khai. Các method read/history/publish cũng phải có kiểm tra quyền tương ứng trước repository call.

### HTTP contract do host thiết kế

Với API tùy biến, định nghĩa rõ route, body và response dùng chung cho client/server. `saveDraft` nhận `expectedRevision`; Nest document-channel API hiện tại dùng `revision` và một envelope khác. Không gọi repository schema là schema HTTP mặc định.

Retry cùng một thao tác phải giữ idempotency key; thao tác mới phải dùng key mới. Trong `RevisionDocumentRepository`, receipt map được tra bằng key; host phải ràng buộc key với actor/payload, chống tái sử dụng key cho nội dung khác và giới hạn retention. Không tự nâng revision để ghi đè sau HTTP 409.

### Publish và lịch sử

Sau khi kiểm tra quyền, gọi `publish({ documentId, revision, actor })`. Public reader dùng `getPublishedBySlug({ slug, locale })`, không đọc draft mới nhất. `listRevisions` trả summary; `getRevision` trả snapshot. Nếu sản phẩm cần restore, service lưu snapshot cũ như một draft revision mới thay vì sửa lịch sử.

### HTML server-side

```ts
import { renderDocumentToHtml } from '@disnote/core/renderer/html';
const result = renderDocumentToHtml({ document, registry });
const html = result.html;
```

Renderer có policy/asset boundary; custom renderer phải giữ escaping và URL policy. Không chèn HTML từ request thẳng vào template hoặc `dangerouslySetInnerHTML`.

## 7. Module nâng cao

| Import | Khi dùng | Host phải cung cấp |
|---|---|---|
| `@disnote/core/database`, `/database/react` | Typed records, filter/sort, các view, workbench | Authorized repository/provider và record-document policy |
| `@disnote/core/workspace`, `/workspace/react` | Pages, trash, backlinks, shared sources | Persistence và quyền theo workspace |
| `@disnote/core/comments`, `/comments/react` | Threads, replies, anchors, mention | Provider và identity đáng tin cậy |
| `@disnote/core/assets` | Upload/presign và asset validation | Storage, quota, scanning, signed access |
| `@disnote/core/storage/react` | History panels | Revision provider được kiểm tra quyền |
| `@disnote/core/collaboration`, `/collaboration/browser` | Yjs transport/update persistence | Auth, provider, reconnect, revoke và server fences |
| `@disnote/core/offline` | Cache/queue khi mất mạng | Reconnect strategy và conflict UX |
| `@disnote/core/search-ai`, `/search-ai/react` | Search projection/AI pipeline | Backend provider, quyền và secrets |
| `@disnote/core/diagrams/react`, `/math` | Mermaid/draw.io và phương trình | UI/runtime phù hợp; fallback cho native |

Database controls dùng CSS `@disnote/core/database/styles.css`. Các cờ `readonly`/`canManage` chỉ là affordance; backend phải enforce lại. Database automation là dịch vụ server-side; scheduler, webhook delivery và policy được host inject.

Yjs seed cần được chọn nguyên tử phía server. `createEditorCollaborationSeed` nằm ở `@disnote/core/editor/react/collaboration`; không khởi tạo cùng document riêng rẽ vào từng client Y.Doc. JSON revision và Yjs generation phải có hàng rào nhất quán.

## 8. Import/export, custom block và migration

`@disnote/core/import-export` cung cấp Markdown/HTML/bundle/Notion cùng diagnostics. Dùng `exportMarkdownLossy` khi chấp nhận mất thông tin. DOCX có subpath `/import-export/docx`, gồm `exportDocx`, `importDocx`, `convertDocxToMarkdown`, `convertMarkdownToDocx`.

Không bỏ qua warnings: snapshot DOCX chỉ exact khi checksum còn hợp lệ; file Word ngoài hệ thống dùng semantic import. Giới hạn ZIP/XML và input size tại server; xem chữ ký options/result trong declaration trước khi xử lý byte.

Quy trình thêm block:

1. Chọn type có namespace, version và props chỉ chứa JSON.
2. Đăng ký core definition, validator và plain-text extractor vào registry/preset của host.
3. Viết renderer HTML/React, adapter editor và native/Flutter builder cho nơi cần hỗ trợ.
4. Thêm migration và fixture before/after khi thay dữ liệu đã lưu.
5. Kiểm tra round-trip, unknown block fallback và quyền với asset/reference bên trong.

Preset article/legal/workspace có subpath riêng; `defineDocumentPreset` cho phép compose preset mà không sửa base. Registry core không tự tạo custom editor UI. Migration registry có `registerDocumentMigration` và `registerBlockMigration`; migration cần tuần tự, quyết định và không làm mất unknown props ngoài policy đã định.

## 9. Spreadsheet độc lập

```ts
import { createWorkbook, setCell, evaluateCell } from '@disnote/sheets';
let workbook = createWorkbook({ id: 'budget', title: 'Budget' });
const sheetId = workbook.activeSheetId;
workbook = setCell(workbook, sheetId, 'A1', { value: 10 });
workbook = setCell(workbook, sheetId, 'A2', { value: 20 });
workbook = setCell(workbook, sheetId, 'A3', { formula: '=SUM(A1:A2)' });
const value = evaluateCell(workbook, sheetId, 'A3');
```

Workbook là model riêng, không nhét vào document block để biến thành nguồn dữ liệu thứ hai. Package có subpath import/export, persistence và adapter MongoDB/PostgreSQL. Host cung cấp grid UI. Không giả định hỗ trợ toàn bộ hàm Excel, macros hoặc giữ nguyên mọi định dạng XLSX ngoài subset đang triển khai.

## 10. Chạy ví dụ và kiểm tra

```bash
npm run build
npm test
npm run lint
npm run build:examples
npm run build-storybook
npm run verify
# Browser riêng, cần browser/runtime và fixture services phù hợp:
npm run test:e2e
```

`verify` gồm typecheck, lint, unit, build, example builds và Storybook; browser E2E là gate riêng. Live Mongo integration cần môi trường được cấu hình, skip không đồng nghĩa đã kiểm chứng database thật.

React reference demo:

```bash
npm run dev --workspace @disnote/react-demo -- --host 127.0.0.1 --port 4173
```

Các route lab `/parity` và `/mobile-editor` phục vụ tham chiếu. Ví dụ allow-all/mock chỉ dùng để học luồng; thay bằng backend policy thật trước deployment.

## 11. Phát hành npm

Root private; ba public workspaces là core/react/sheets. Dùng Changesets để đồng bộ version và dependency nội bộ:

```bash
npm run changeset
npm run release:status
npm run version-packages
npm run release:preflight
npm run verify
npm run test:e2e
npm run release:pack-check
```

Review manifest, changelog, archive, license và public exports sau versioning. Sau khi các gate của release đã pass, maintainer mới chạy `npm run release:publish` và đẩy tag theo workflow hiện có. Workflow npm dùng cấu hình xác thực trong `.github/workflows`; kiểm tra cấu hình thực tế trước release. Tài liệu này không thực hiện publish/commit/push.

## 12. Xử lý lỗi thường gặp

| Hiện tượng | Hướng xử lý |
|---|---|
| npm không thấy `@disnote/react`/bản mới | Dùng packed local hoặc xác nhận package/version đã phát hành |
| `initialDocument` đổi nhưng UI cũ | Uncontrolled editor: chủ động reset bằng key thích hợp |
| Có callback nhưng reload mất dữ liệu | Bổ sung backend save và kiểm tra receipt, không chỉ setState |
| Lưu trả conflict | Giữ draft, tải revision hiện tại, merge/review trước thao tác mới |
| SSR lỗi DOM hoặc bundle lớn | Import đúng reader/server subpath; tách client editor |
| Custom block bị từ chối | Đồng bộ registry, props version và strict validation phía server |
| Native không hiện như web | Viết native projection/builder hoặc dùng WebView editor |
| Hai client thấy nội dung nhân đôi | Kiểm tra seed Yjs duy nhất và generation fence |

## 13. Bài thực hành: create → load → save → publish → restore

### 13.1. Chạy một vòng đời trước khi nối UI

Tạo `document-lifecycle.mts` trong Node consumer đã cài core. Chạy bằng TypeScript runner của host, ví dụ `npx tsx document-lifecycle.mts` sau khi cài `tsx` như dev dependency. File này dùng memory repository nên tập trung vào hành vi; bước 14 thay persistence bằng database thật.

```ts
// document-lifecycle.mts
import assert from 'node:assert/strict';
import {
  createDocument, createDefaultRegistry, paragraph, text,
} from '@disnote/core';
import { InMemoryDocumentRepository } from '@disnote/core/storage';

const repository = new InMemoryDocumentRepository({
  registry: createDefaultRegistry(),
});
const actor = 'user_01'; // Trong API thật lấy từ session đã verify.
const initial = createDocument({
  id: 'doc_intro',
  metadata: { title: 'Giới thiệu', locale: 'vi' },
  blocks: [paragraph([text('Bản đầu tiên')])],
});
await repository.create({
  document: initial, actor, slug: 'gioi-thieu',
  locale: 'vi', kind: 'ARTICLE', title: 'Giới thiệu',
});

const stored = await repository.getById(initial.id);
if (!stored) throw new Error('document.not_found');
const opened = await repository.getRevision(initial.id, stored.currentRevision);
if (!opened) throw new Error('document.revision_missing');
assert.equal(opened.document.id, initial.id);

const edited = {
  ...opened.document,
  metadata: { ...opened.document.metadata, updatedAt: new Date().toISOString() },
  blocks: [paragraph([text('Nội dung đã sửa')])],
};
const saveInput = {
  documentId: initial.id, document: edited, actor,
  expectedRevision: stored.currentRevision,
  idempotencyKey: 'op_intro_edit_01',
};
const saved = await repository.saveDraft(saveInput);
if (!saved.ok) throw new Error(saved.reason);
assert.equal(saved.revision, 2);

// Retry cùng thao tác không tạo revision mới.
const retried = await repository.saveDraft(saveInput);
assert.deepEqual(retried, saved);

await repository.publish({ documentId: initial.id, revision: saved.revision, actor });
const published = await repository.getPublishedBySlug({ slug: 'gioi-thieu', locale: 'vi' });
assert.equal(published?.revision.revision, 2);

// Restore bản đầu bằng cách append snapshot cũ thành revision mới.
const old = await repository.getRevision(initial.id, 1);
if (!old) throw new Error('document.revision_missing');
const restored = await repository.saveDraft({
  documentId: initial.id, document: old.document, actor,
  expectedRevision: saved.revision, idempotencyKey: 'op_intro_restore_01',
});
if (!restored.ok) throw new Error(restored.reason);
assert.equal(restored.revision, 3);
assert.equal((await repository.listRevisions(initial.id)).length, 3);
// Restore chỉ tạo draft; public vẫn là revision 2.
assert.equal((await repository.getPublishedBySlug({
  slug: 'gioi-thieu', locale: 'vi',
}))?.revision.revision, 2);
```

Các block ID mới trong ví dụ được tạo bằng builder. Trong editor thật, sửa paragraph đang có nên giữ ID của block để comment anchors/reference còn liên kết đúng; không dựng lại toàn bộ cây với ID mới sau mỗi keystroke.

### 13.2. Response gửi cho editor

`getById()` trả `StoredDocument`, không chứa toàn bộ body. Để mở editor, service đọc revision tương ứng và tạo DTO, ví dụ:

```json
{
  "document": {
    "format": "disnote-document",
    "schemaVersion": 1,
    "id": "doc_intro",
    "metadata": {
      "createdAt": "2026-11-20T00:00:00.000Z",
      "updatedAt": "2026-11-20T00:00:00.000Z"
    },
    "blocks": []
  },
  "revision": 1,
  "permissions": { "read": true, "write": true, "publish": false }
}
```

Đây là DTO ví dụ do host thiết kế, không phải route/envelope mặc định của thư viện. Không trả toàn bộ state/receipt map cho client. Khi đọc stored rồi revision bằng hai lời gọi, có thể gặp writer xen giữa; snapshot vẫn phải nhất quán với revision trả về, hoặc adapter host cung cấp một phép đọc snapshot nguyên tử khi sản phẩm yêu cầu latest-read chặt hơn.

### 13.3. Nối React và autosave

Hook của host giữ ít nhất: `draft`, `baseRevision`, `dirtyGeneration`, pending operation key, `saveStatus` và `lastError`. Quy trình:

1. Load snapshot và quyền từ API, sau đó mới mount editor với `initialDocument`.
2. `onChange` cập nhật draft và tăng generation; debounce trước khi lưu.
3. Khi gửi, chụp một bộ bất biến gồm payload, base revision và operation key.
4. Nếu có thay đổi mới trong khi request chạy, giữ draft mới; response của request cũ chỉ xác nhận generation cũ.
5. Save thành công cập nhật base revision. Chỉ xóa dirty nếu generation hiện tại trùng generation đã gửi.
6. Mất mạng: retry cùng payload/key. HTTP 409: giữ draft và dừng automatic overwrite.
7. Trước khi đổi route, flush/nhắc giữ draft theo UX của sản phẩm; không remount editor mỗi lần nhận receipt.

Không gọi `publish` sau mỗi autosave. Public content và draft là hai nhánh hiển thị khác nhau như ví dụ ở mục 14 của tài liệu kiến trúc.

## 14. Lưu database thật và kiểm tra sau restart

### 14.1. MongoDB consumer

Host cài driver `mongodb` và quản lý URI qua biến môi trường. Ví dụ composition sau chọn collection rõ ràng, khởi tạo index rồi cung cấp repository cho application service:

```ts
// mongo-composition.mts
import { MongoClient } from 'mongodb';
import { createDefaultRegistry } from '@disnote/core';
import { createMongoDocumentRepository } from '@disnote/core/persistence/mongodb';

const uri = process.env.DOCUMENT_MONGO_URI;
if (!uri) throw new Error('document.database_uri_missing');
const client = new MongoClient(uri);
await client.connect();
const collection = client.db('disnote').collection<Record<string, unknown>>('document_states');
const { states, documents } = createMongoDocumentRepository({
  collection,
  registry: createDefaultRegistry(),
});
await states.initialize();

// Inject documents vào service. Giữ client sống trong lifecycle của server.
// Khi server shutdown: await client.close().
```

Nếu phiên bản driver của host không structurally assign được vào port, viết wrapper mapping `createIndex/findOne/insertOne/updateOne` theo `MongoDocumentStateCollection`; không sửa core để phụ thuộc driver của một ứng dụng.

### 14.2. Trình tự chứng minh đã lưu bền vững

1. Chạy create/save bằng repository database, ghi lại document ID và revision nhận được.
2. Đọc lại qua API, kiểm tra nội dung và revision; trong database kiểm tra `state.revisions` có snapshot mới.
3. Tắt process server, khởi động lại cùng database/collection/table.
4. Load bằng ID cũ; body và history phải còn. Nếu mất, kiểm tra có vô tình dùng memory provider không.
5. Mở hai client cùng base revision và lưu hai nội dung khác nhau: một thao tác phải conflict, không âm thầm ghi đè.

Không thay dữ liệu database bằng tay sau khi kiểm tra để làm UI trông đúng. Luồng thành công cần receipt và readback của cùng repository.

### 14.3. Khi tự viết adapter

`DocumentStateRepository` có `read`, `write`, `findBySlug`. `write(next, null)` nghĩa create-if-absent; `write(next, previousStoreRevision)` nghĩa update-if-version-match. Với SQL, predicate phải gồm ID và revision trong **cùng UPDATE**. Với nhiều bảng normalized, dùng transaction cho metadata, revision và receipt.

Layout mặc định là một state aggregate; xem JSON/DDL chi tiết ở [kiến trúc](ARCHITECTURE.md#13-dữ-liệu-thực-sự-được-lưu-như-thế-nào). Hạn mức lịch sử, receipt retention, backup và tenant slug không được giải quyết chỉ bằng đổi collection name.

## 15. Custom block từ đầu: `consumer.notice`

Mục tiêu: khối thông báo có tiêu đề, nội dung và tone. Cùng JSON này phải được server validate, lưu vào revision, render trên React/HTML và hiển thị trong Flutter. Type/props là hợp đồng versioned của host, không chỉ là CSS.

### 15.1. Schema và validator

```ts
// notice.ts
import {
  customBlock, defineCoreBlock, defineDocumentPreset, workspacePreset,
  ok, fail, issue, type ValidationResult,
} from '@disnote/core';

export const NOTICE_TYPE = 'consumer.notice';
export type NoticeProps = {
  title: string;
  message: string;
  tone: 'info' | 'warning';
};

export function validateNotice(input: unknown): ValidationResult<NoticeProps> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return fail([issue('props', 'notice.invalid', 'notice.props_object_required')]);
  }
  const value = input as Record<string, unknown>;
  if (typeof value.title !== 'string' || value.title.length > 120 ||
      typeof value.message !== 'string' || value.message.length > 2000 ||
      (value.tone !== 'info' && value.tone !== 'warning')) {
    return fail([issue('props', 'notice.invalid', 'notice.props_invalid')]);
  }
  return ok({ title: value.title, message: value.message, tone: value.tone });
}

export const noticeDefinition = defineCoreBlock<NoticeProps>({
  type: NOTICE_TYPE,
  version: 1,
  capabilities: {
    inlineContent: false, children: false,
    selectable: true, draggable: true, commentable: true,
  },
  validateProps: validateNotice,
  toPlainText: block => `${block.props.title}\n${block.props.message}`,
});

export const productPreset = defineDocumentPreset({
  id: 'consumer.documents',
  base: workspacePreset,
  blocks: [noticeDefinition],
  maxDepth: 10,
});

export function createNotice(props: NoticeProps) {
  const validated = validateNotice(props);
  if (!validated.ok) throw new Error('notice.props_invalid');
  return customBlock(NOTICE_TYPE, 1, { props: validated.value });
}
```

`title`/`message` là nội dung do người dùng nhập, không phải nhãn UI cần dịch. Mã lỗi dùng identifier; UI ánh xạ sang catalog vi/en. `validateProps` trả giá trị chuẩn hóa nhưng document validator không tự thay toàn bộ props bằng giá trị đó; factory hoặc service phải áp dụng normalization nếu muốn loại bỏ field thừa. Ví dụ `createNotice` làm việc này trước khi tạo block.

### 15.2. Dùng cùng registry ở client và server

```ts
// notice-document.ts
import { createDocument, validateDocument } from '@disnote/core';
import { createNotice, productPreset } from './notice.js';

export const noticeDocument = createDocument({
  blocks: [createNotice({ title: 'Lưu ý', message: 'Nội dung mẫu', tone: 'info' })],
});
const check = validateDocument(noticeDocument, {
  registry: productPreset.registry,
  maxDepth: productPreset.maxDepth,
  strictUnknownBlocks: true,
});
if (!check.ok) throw new Error(JSON.stringify(check.issues));
```

Inject `productPreset.registry` vào repository thay `createDefaultRegistry()`. Nếu server thiếu definition, strict save sẽ từ chối block dù React hiển thị được. Preset `maxDepth`/allowed hosts/capabilities là cấu hình, host phải truyền xuống validator/policy tương ứng; chỉ khai báo preset không tự cấu hình mọi tầng. Repository revision hiện nhận registry, không nhận toàn bộ preset và không tự enforce mọi giới hạn host.

## 16. Custom React renderer, HTML và React Native

### 16.1. React reader

```tsx
// NoticeReader.tsx
import { DocumentView } from '@disnote/core/react/view';
import type { ReactBlockRenderers } from '@disnote/core/renderer/react';
import { NOTICE_TYPE, productPreset, validateNotice } from './notice.js';
import { noticeDocument } from './notice-document.js';

const renderers: ReactBlockRenderers = {
  [NOTICE_TYPE]: ({ block }) => {
    const checked = validateNotice(block.props);
    if (!checked.ok) return null; // Host có thể thay bằng fallback đã i18n.
    return <aside data-tone={checked.value.tone}>
      <strong>{checked.value.title}</strong>
      <p>{checked.value.message}</p>
    </aside>;
  },
};

export function NoticeReader() {
  return <DocumentView document={noticeDocument}
    registry={productPreset.registry} blockRenderers={renderers} />;
}
```

React escape text mặc định. Không thay `<p>{message}</p>` bằng raw HTML. Custom renderer tự chịu trách nhiệm render children/inline nếu schema của nó cho phép; ví dụ này không cho children nên không render cây con.

### 16.2. HTML phía server

```ts
// notice-html.ts
import { renderDocumentToHtml } from '@disnote/core/renderer/html';
import { NOTICE_TYPE, productPreset, validateNotice } from './notice.js';
import { noticeDocument } from './notice-document.js';

export const htmlResult = renderDocumentToHtml({
  document: noticeDocument,
  registry: productPreset.registry,
  policy: {
    blockRenderers: {
      [NOTICE_TYPE]: ({ block, escape }) => {
        const checked = validateNotice(block.props);
        if (!checked.ok) return '';
        return `<aside><strong>${escape(checked.value.title)}</strong>` +
          `<p>${escape(checked.value.message)}</p></aside>`;
      },
    },
  },
});
```

Chỉ dữ liệu đã escape đi vào HTML string. Nếu props có URL, validate URL trước khi tạo attribute; escape một URL không làm scheme nguy hiểm thành an toàn.

### 16.3. React Native reader

Trong `DocumentNativeRenderer`, truyền `blockRenderers` có key `NOTICE_TYPE`; callback nhận `block`, `renderInline`, `renderChildren`. Render bằng `View/Text` của host và dùng lại validator. Style native dùng object, không phải CSS class. Giữ props JSON chung; không lưu object React Native StyleSheet, function hoặc React element vào document.

## 17. Custom giao diện và trải nghiệm editor

### 17.1. Chọn đúng cấp custom

| Muốn thay đổi | Cách làm | Dữ liệu có cần đổi không? |
|---|---|---|
| Font, radius, padding, màu surface | `style`, CSS tokens, className | Không |
| Nhãn toolbar/menu | `locale`, `messages`, catalog host | Không |
| Ẩn toolbar/menu | `chrome` | Không |
| Thêm command chèn mẫu nội dung | `insertCommands` tạo canonical block | Có block mới, schema vẫn như cũ nếu dùng built-in |
| Render custom block ở reader | `blockRenderers` + registry | Có schema custom nếu type mới |
| Form chỉnh sửa props custom | Form host + validate + draft update | Có, cần giữ ID/version |
| UI editor inline hoàn toàn mới | Cần adapter/schema integration tương ứng | Không tự có chỉ từ registry |

Public editor facade hiện không có prop inject tùy ý BlockNote block specs. Registry custom làm core/server hiểu dữ liệu; nó không tự sinh form hoặc toolbar cho block mới. Adapter có generic `disnoteBlock` wrapper cho type không map trực tiếp; kiểm tra round-trip và UX trước khi dùng wrapper như editor production cho custom block.

Với `consumer.notice`, host có thể cung cấp một side form chỉnh title/message/tone, validate rồi cập nhật draft qua luồng editor/adapter được kiểm soát. Nếu cần custom inline UI, xây adapter mở rộng và kiểm tra mapping canonical ↔ vendor; không tự truyền prop `registry`/`blockSpecs` chưa được `DocumentEditorProps` hỗ trợ.

### 17.2. Command chèn block built-in có nhãn i18n

```ts
// notice-command.ts
import { callout, text } from '@disnote/core';
import type { EditorInsertCommand } from '@disnote/core/editor';

const COMMAND_ID = 'consumer.insert-warning';
export function warningCommands(t: (key: string) => string): EditorInsertCommand[] {
  return [{
    id: COMMAND_ID,
    title: t('document.insertWarning'),
    description: t('document.insertWarningDescription'),
    create: () => callout([text(t('document.warningInitialContent'))], 'warning'),
  }];
}
```

Host khai báo đủ ba key trên ở vi/en, memoize `warningCommands(t)` rồi truyền vào `insertCommands`. Ví dụ dùng `callout` built-in nên không cần mở rộng editor schema. `includeDefaultCommands` quyết định giữ command mặc định; kiểm tra accessibility/keyboard sau khi thay menu.

### 17.3. Theme scoped theo instance

Truyền `theme="dark"` cho editor; reader dùng `appearance="dark"` hoặc `theme` renderer theo props thực tế. Hai component không có prop theme cùng kiểu. CSS token override chỉ thay presentation, không đổi textColor/backgroundColor đã lưu trong nội dung. Nếu sản phẩm cần nhiều theme, persist lựa chọn theme ở preferences của người dùng thay vì ghi toàn bộ CSS tokens vào từng document.

## 18. Nâng schema custom và kiểm tra không mất dữ liệu

Giả sử phiên bản 1 dùng `message`, phiên bản 2 đổi thành `body`. Không đổi validator cũ rồi để dữ liệu đã lưu tự hỏng. Tạo definition v2 và migration riêng:

```ts
// notice-migration.ts
import { createMigrationRegistry, type DisNoteDocument } from '@disnote/core';
import { NOTICE_TYPE } from './notice.js';

const migrations = createMigrationRegistry().registerBlockMigration(
  NOTICE_TYPE, 1, 2,
  block => {
    const { message, ...remaining } = block.props;
    return { ...block, props: { ...remaining, body: String(message ?? '') } };
  },
);

export function migrateNoticeDocument(input: DisNoteDocument) {
  const result = migrations.migrate(structuredClone(input));
  if (!result.ok) throw new Error(result.error.code);
  return result.document;
}
```

Migration registry tăng block version theo step; example callback không tự tăng lần nữa. Sau migrate, validate bằng registry **v2** của host; registry v1 trong mục 15 chỉ phục vụ ví dụ v1, không được dùng làm registry đích. Lưu kết quả thành revision mới theo policy migration và giữ snapshot cũ để rollback.

Các bước review custom block trước tích hợp:

- Factory tạo JSON đúng props/type/version, ID không trùng trong cây.
- Server strict validation nhận input hợp lệ và từ chối props sai.
- Save → restart → load giữ props; publish reader và draft reader nhất quán.
- Canonical → editor → canonical không mất custom props/ID/version.
- React, HTML, native/Flutter có renderer hoặc fallback có chủ đích.
- Migration v1→v2 giữ ID và dữ liệu, không mutate input khi thất bại.
- Export/import báo rõ mode lossy/semantic; custom DOCX codec không tự sinh từ core definition.

Đọc declarations trong `dist` hoặc source interface khi mở rộng; không copy API tên tương tự của editor vendor rồi coi đó là public API DisNote.
