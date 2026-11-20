# Hướng dẫn frontend Flutter Web, Android và iOS

SDK `disnote_flutter` ở `sdks/flutter` dùng canonical document chung với React/TypeScript và Go. Backend mặc định của client là NestJS document-channel API. Đọc [kiến trúc](ARCHITECTURE.md), [TypeScript](TYPESCRIPT.md) hoặc [Go](GO_BACKEND.md) khi làm phần tương ứng.

## 1. Khả năng và điều kiện

| Thành phần | Khả năng |
|---|---|
| Model/validator/canonical | Parse/serialize, validation và checksum |
| `DisNoteDocumentView` | Reader native responsive, vi/en, theme và custom builders |
| `DisNoteDocumentEditor` | Editor React qua iframe Web hoặc WebView Android/iOS |
| `DisNoteNestClient` | Pages, save, history/restore và các API workspace hỗ trợ |
| `DisNoteDocumentSession` | Load, debounce save, revision và trạng thái conflict |
| `DisNoteHttpTransport` | Inject HTTP stack; có adapter `package:http` |

Không có full editor Dart thuần. Reader là projection an toàn; math/diagram/database/media có thể dùng source, card hoặc link thay UI tương tác web. Desktop Windows/macOS/Linux chưa được khai báo là nền tảng editor hỗ trợ.

Manifest hiện tại khai báo Dart `>=3.13.0 <4.0.0`, Flutter `>=3.50.0`, package version `0.1.0`, `material_ui ^1.11.1`, `webview_flutter ^4.10.0`. Dùng bounds của checkout đang cài; không lấy version manifest làm bằng chứng pub.dev đã phát hành.

## 2. Cài đặt

Sau khi phiên bản phù hợp có trên pub.dev:

```bash
flutter pub add disnote_flutter
```

Phát triển local:

```yaml
dependencies:
  disnote_flutter:
    path: ../DisNote-Document-Library/sdks/flutter
```

Hoặc pin commit/tag có thể truy cập:

```yaml
dependencies:
  disnote_flutter:
    git:
      url: https://github.com/DisNote-Project/DisNote-Document-Library.git
      ref: YOUR_COMMIT_OR_TAG
      path: sdks/flutter
```

```bash
flutter pub get
```

Import SDK bằng `package:disnote_flutter/disnote_flutter.dart`. Ví dụ widget sử dụng `package:material_ui/material_ui.dart` theo dependencies hiện tại. Nếu host dùng trực tiếp package đó, khai báo dependency trực tiếp phù hợp.

## 3. Đọc và kiểm tra document

```dart
import 'dart:convert';
import 'package:disnote_flutter/disnote_flutter.dart';

DisNoteDocument parseDocument(String source) {
  final Object? decoded = jsonDecode(source);
  if (decoded is! Map<String, Object?>) {
    throw const FormatException('document.invalid');
  }
  final document = DisNoteDocument.fromJson(decoded);
  final result = DisNoteValidator.validate(document);
  if (!result.isValid) {
    throw const FormatException('document.invalid');
  }
  return document;
}
```

`fromJson` kiểm tra cấu trúc parse; tiếp tục gọi validator để kiểm tra ngữ nghĩa. Chỉ lưu `document.toJson()` như canonical model. JSON document gồm format, schemaVersion, ID, metadata, blocks; metadata yêu cầu createdAt/updatedAt hợp lệ.

### Reader tối thiểu

```dart
DisNoteDocumentView(
  document: document,
  locale: 'vi',
  theme: const DisNoteRendererTheme(
    maxContentWidth: 920,
    columnBreakpoint: 600,
  ),
  assetResolver: (assetId) => signedAssetUris[assetId],
  onLinkTap: openApprovedUri,
)
```

Trong ví dụ, `signedAssetUris` là map `String -> Uri` do host cung cấp, `openApprovedUri` kiểm tra scheme/host trước khi mở. Không trả token dài hạn từ asset resolver.

Reader hỗ trợ các projection cho text, heading, lists, checklist, toggle, quote, code, callout, image, table, math source, contents, bookmark, media/file cards, columns, database links và diagrams. `blockBuilders` override theo block type:

```dart
DisNoteDocumentView(
  document: document,
  blockBuilders: {
    'consumer.card': (context, block) => ProductCard(props: block.props),
  },
)
```

`ProductCard` là widget của host. Nếu embed vào scroll view có sẵn, dùng `scrollable: false` và bố trí constraints phù hợp. Reader tự stack columns khi hẹp theo breakpoint; grid/database tương tác cần builder hoặc route riêng.

## 4. Trang React editor dùng chung

Flutter editor cần một trang HTTPS đã deploy, ví dụ `/mobile-editor`. Trang này mount `MobileEditorBridge`, nhận canonical document qua handshake và trả draft qua bridge. Không cần nhúng token backend vào URL.

Ví dụ client React route; `allowedHostOrigins` và callback được khai báo ngoài component để identity ổn định:

```tsx
import { MobileEditorBridge } from '@disnote/core/editor/react';
import '@disnote/core/styles.css';

const ALLOWED_HOST_ORIGINS = ['https://app.example.com'];

function sendToHost(message: string) {
  const native = (window as unknown as {
    ReactNativeWebView?: { postMessage: (data: string) => void };
  }).ReactNativeWebView;
  if (native) {
    native.postMessage(message);
    return;
  }
  if (!document.referrer) return;
  let origin: string;
  try { origin = new URL(document.referrer).origin; }
  catch { return; }
  if (ALLOWED_HOST_ORIGINS.includes(origin)) {
    window.parent.postMessage(message, origin);
  }
}

export function EditorRoute() {
  return <MobileEditorBridge
    allowedHostOrigins={ALLOWED_HOST_ORIGINS}
    postMessage={sendToHost}
  />;
}
```

Trong ứng dụng thật, origins/routes/header keys đưa vào constants/config. Origin phải gồm scheme, host và port tương ứng; không tự tin cậy referrer nếu không nằm trong allow-list. Khi dùng iframe khác origin, kiểm tra chính sách referrer để trang có thể xác định parent, hoặc cấu hình host origin đã biết qua cơ chế tin cậy.

Triển khai CSP `frame-ancestors` cho phép đúng origin Flutter Web. Không đặt `X-Frame-Options: DENY` cho route cần embed. CORS của NestJS API là cấu hình riêng, không thay thế quyền embed iframe.

## 5. Mount editor trong Flutter

```dart
DisNoteDocumentEditor(
  editorUri: Uri.parse('https://editor.example.com/mobile-editor'),
  document: document,
  locale: 'vi',
  editable: canWrite,
  allowedOrigins: const {'https://editor.example.com'},
  onDocumentChanged: session.acceptEditorChange,
  onError: (error, stackTrace) => reportError(error, stackTrace),
)
```

Editor dùng `StackFit.expand`, nên đặt trong layout có chiều cao hữu hạn như `Expanded` hoặc `SizedBox`. Dùng cùng widget trên Web/Android/iOS.

| Option | Vai trò |
|---|---|
| `editorUri` | Absolute HTTPS URL của trang bridge |
| `document` | Canonical document hợp lệ |
| `editable` | UI có cho sửa; không thay server authorization |
| `allowedOrigins` | Origin editor được tin cậy; mặc định origin của URI |
| `locale`, `messages` | Ngôn ngữ và override vi/en |
| `onReady`, `onError` | Trạng thái handshake/runtime |
| `onNavigationBlocked` | Host xử lý navigation bị chặn |
| `loadingBuilder`, `errorBuilder` | UI chờ/lỗi và retry |
| `allowInsecureLocalhost` | Cho HTTP loopback khi phát triển; không cho host remote |

Web kiểm tra source window/origin của iframe. Native giới hạn navigation theo origins. Protocol có version và giới hạn 5 MB; payload invalid, sai document hoặc sai version bị từ chối. Giới hạn response API mặc định là 8 MB, khác giới hạn bridge; server có thể có hạn mức thấp hơn.

Không coi prop `document` như bảo đảm hot-replace toàn bộ nội dung đang được edit: bridge khởi tạo editor theo handshake. Khi người dùng chọn reload/replace toàn bộ snapshot, quản lý key/reset generation có chủ đích; không remount sau mỗi autosave.

## 6. Kết nối NestJS

```dart
final transport = DisNotePackageHttpTransport();
final client = DisNoteNestClient(
  baseUri: Uri.parse('https://api.example.com'),
  transport: transport,
  headersProvider: () async => {
    'authorization': 'Bearer ${await accessToken()}',
    'x-device-id': await deviceId(),
  },
);

final session = DisNoteDocumentSession(
  client: client,
  channelId: channelId,
  pageId: pageId,
  idempotencyKeyFactory: createUniqueOperationKey,
);
await session.load();
```

`accessToken`, `deviceId`, `createUniqueOperationKey`, channel/page IDs do host cung cấp. Đưa header keys/base URL vào constants; session/auth refresh nằm trong auth stack của ứng dụng. Không nhét server secret trong Flutter.

Client mặc định có API prefix `/api/v1` và routes document-channel. `openPage` cần response chứa document và revision, trực tiếp hoặc trong `page`. `savePage` gửi document, revision, idempotencyKey và optional collaboration revision/generation.

| API | Mục đích |
|---|---|
| `openPage` | Tải snapshot document/revision |
| `savePage` | Lưu với CAS và operation key |
| `listPages` | Danh sách trang, hỗ trợ trash |
| `history`, `restore` | Lịch sử và khôi phục theo hợp đồng Nest |
| Các phương thức collaboration/comments/shared-source/search/workspace | Tích hợp capability của backend; xem chữ ký trong `api_client.dart` |

SDK không cung cấp một UI hoàn chỉnh cho tất cả các API trên. Host cần route, state manager và permission UX tương ứng.

Nếu backend là Gin adapter của Go SDK, viết adapter request/response hoặc giữ API Nest-compatible trên Go. Không trỏ `baseUri` sang Go và kỳ vọng tự đổi route, envelope hay field revision.

### Dùng Dio hoặc auth stack có sẵn

Implement `DisNoteHttpTransport.send(DisNoteHttpRequest)` rồi trả `DisNoteHttpResponse`. Adapter chịu trách nhiệm mapping method/headers/body, timeout, cancel và refresh theo policy của host. Chỉ retry thao tác ghi nếu giữ đúng operation key và payload.

`DisNotePackageHttpTransport` mặc định timeout 30 giây, sở hữu client khi tự tạo. `close()` chỉ đóng client do adapter sở hữu; client được inject từ ngoài do host quản lý.

## 7. Bind session vào UI

```dart
// session đã load; permission và widgets thông báo do host cung cấp.
ListenableBuilder(
  listenable: session,
  builder: (context, child) {
    final current = session.document;
    if (current == null) return buildLoadingOrFailure(session);
    if (session.status == DisNoteSessionStatus.conflict) {
      return buildConflictReview(session, current);
    }
    return DisNoteDocumentEditor(
      editorUri: editorUri,
      document: current,
      locale: 'vi',
      editable: permissions.write && session.canEdit,
      onDocumentChanged: session.acceptEditorChange,
      onError: reportError,
    );
  },
)
```

`build*`, permission và error reporter là code host; nhãn trạng thái cần vi/en. `session.canEdit` là trạng thái local, không phải quyền từ backend. `acceptEditorChange` yêu cầu document đúng page ID và đã load revision.

Session debounce mặc định 750 ms, theo dõi edit generation và giữ operation key cho pending save. Theo dõi `hasUnsavedChanges`, `status`, `revision`, `conflictingRevision` và `error`; `onDocumentChanged` riêng lẻ chưa chứng minh lưu thành công.

## 8. Conflict và vòng đời

Khi CAS conflict, session giữ draft và chuyển status `conflict`. Không tự ghi đè revision mới.

| Lựa chọn host | Hành vi cần hiểu |
|---|---|
| Giữ/export draft | Sao chép `document.toJson()` trước thao tác tải lại |
| `load()` | Tải server snapshot, thay draft và xóa pending key |
| `retry()` lúc conflict | Hiện tại gọi `load()`, có thể thay draft local |
| `adoptServerRevision(n)` | Giữ draft local và lên lịch save trên revision mới; chỉ dùng sau quyết định merge/overwrite có chủ đích |
| `flush()` | Gửi pending save; vẫn cần kiểm tra status/unsaved sau khi await |

`conflictingRevision` có thể rỗng nếu backend trả HTTP 409 qua exception thay vì body save result. Lấy server snapshot bằng luồng review riêng khi cần; không suy ra một revision tùy ý.

Trước khi rời trang/background, gọi `await session.flush()` ở hook/navigation lifecycle có thể await, kiểm tra còn unsaved hoặc conflict, rồi mới dispose theo quyết định sản phẩm. Không `await` trong `State.dispose`. Khi process bị kill, callback lifecycle không bảo đảm chạy; muốn khôi phục draft cần local persistence riêng.

Session `dispose()` và transport `close()` sau khi hoàn tất lifecycle. Không dispose shared transport nếu screen không sở hữu nó.

## 9. Cấu hình nền tảng

- Android: bảo đảm Internet permission, native WebView khả dụng; production dùng HTTPS.
- iOS: dùng HTTPS và ATS mặc định; kiểm tra keyboard, safe area và WebView trên thiết bị.
- Web: cấu hình iframe CSP/origin, API CORS và phương thức auth phù hợp. Cookie cross-origin có thể cần transport/cấu hình trình duyệt riêng.
- Localhost: `localhost` trong emulator/điện thoại không nhất thiết là máy phát triển. Nếu cần địa chỉ remote, dùng HTTPS dev endpoint phù hợp thay vì nới allow-list HTTP toàn mạng.
- Asset/link: kiểm tra URL trước khi mở, dùng signed URL ngắn hạn; custom builder phải giữ policy cho reference/asset.

## 10. Kiểm tra trước tích hợp và phát hành

```bash
# Repository TypeScript, khi thay contract:
npm run contracts:export
# Trong sdks/flutter:
flutter pub get
dart format --output=none --set-exit-if-changed lib test example
flutter analyze
flutter test
flutter test --platform chrome test/web_compile_test.dart
dart pub publish --dry-run
```

Widget/VM tests và Chrome compile không thay E2E API thật hoặc kiểm thử Android/iOS. Kiểm tra thêm: login/refresh, read-only policy, bridge wrong-origin, save/reload, concurrent edit/conflict, mất mạng, đổi trang, resize/rotate, IME, upload và thu hồi quyền.

Nếu Flutter SDK bị chặn ghi lockfile hoặc thiếu browser/native toolchain, ghi nhận gate chưa chạy; không dùng kết quả lịch sử để tuyên bố đã pass.

## 11. Phát hành pub.dev

Đây là hướng dẫn thao tác theo cấu hình repository hiện có; kiểm tra trạng thái package và tài khoản tại thời điểm phát hành. Package root là `sdks/flutter`, không phải root npm.

1. Review `pubspec.yaml`, tăng version, cập nhật `CHANGELOG.md`, README và license.
2. Chạy đầy đủ gate ở trên và review inventory dry-run; không chứa secrets/build/cache/tests/lockfile ngoài chủ đích đóng gói.
3. Khi chưa từng phát hành, maintainer thực hiện `dart pub publish` trong package root và hoàn tất auth/confirmation. Bản phát hành chưa được tài liệu này thực hiện.
4. Với tự động hóa, đối chiếu `.github/workflows/publish-flutter.yml`: tag `disnote_flutter-v{{version}}`, environment `pub.dev`, OIDC; cấu hình authorization tương ứng trong tài khoản pub.dev sau khi package tồn tại.
5. Các bản sau tăng version rồi tạo tag khớp chính xác manifest sau khi source đã review và CI pass. Không tái sử dụng tag của phiên bản đã publish.

README/changelog/license tại package root cần giữ để archive pub.dev tự mô tả được. Không cần duy trì thêm bản hướng dẫn dài song song với tài liệu này.

## 12. Xử lý lỗi

| Hiện tượng | Kiểm tra |
|---|---|
| Không resolve package | Version đã publish chưa; path/ref đúng chưa; Flutter/Dart bounds |
| Editor loading mãi | Route bridge đã deploy, origin/referrer/CSP và handshake |
| Iframe bị chặn | `frame-ancestors`/X-Frame-Options, URL HTTPS và origin |
| Editor lỗi layout | Parent đã cung cấp chiều cao hữu hạn chưa |
| Reader khác web | Native projection; thêm block builder cho tương tác cần thiết |
| Save lỗi 401/403 | Token refresh/device header và backend policy; không bật UI để bypass |
| Save conflict | Giữ draft và review; `retry()` tại conflict tải lại server |
| Flush xong vẫn unsaved | Kiểm tra status/error/conflict; await không đồng nghĩa receipt thành công |
| Flutter gọi Go lỗi parse/404 | Nest client và Gin routes/envelope khác nhau |
