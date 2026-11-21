# Hướng dẫn frontend Flutter Web, Android và iOS

SDK `disnote_flutter` ở `sdks/flutter` dùng canonical document chung với React/TypeScript và Go. Backend mặc định của client là NestJS document-channel API. Đọc [kiến trúc](ARCHITECTURE.md), [TypeScript](TYPESCRIPT.md) hoặc [Go](GO_BACKEND.md) khi làm phần tương ứng.

**Lộ trình cho dev mới:** chạy reader độc lập ở mục 13, hiểu ownership dữ liệu ở mục 14, rồi nối session/backend ở mục 6–8 và 15. Mục 16–18 hướng dẫn custom block, theme và draft recovery. Đọc kỹ các tên dependency “host cung cấp” trước khi copy ví dụ; SDK không tự cấp API URL, tài khoản hay database.

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

## 13. Ví dụ reader hoàn chỉnh trước khi nối backend

Sau khi cấu hình dependency, thay `lib/main.dart` của ứng dụng thử nghiệm bằng ví dụ này. Nó chạy hoàn toàn từ model Dart, không cần editor URL hay API server:

```dart
// lib/main.dart
import 'package:material_ui/material_ui.dart';
import 'package:disnote_flutter/disnote_flutter.dart';

void main() => runApp(const DemoApp());

class DemoApp extends StatelessWidget {
  const DemoApp({super.key});

  static const document = DisNoteDocument(
    id: 'doc_intro',
    metadata: DisNoteMetadata(
      title: 'Giới thiệu',
      locale: 'vi',
      createdAt: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    ),
    blocks: [
      DisNoteBlock(
        id: 'block_intro', type: 'paragraph', version: 1,
        content: [DisNoteText('Xin chào từ Flutter')],
      ),
    ],
  );

  @override
  Widget build(BuildContext context) => MaterialApp(
    home: Scaffold(
      body: SafeArea(
        child: DisNoteDocumentView(document: document, locale: 'vi'),
      ),
    ),
  );
}
```

Tiêu đề và paragraph ở đây là nội dung ví dụ. Với nhãn nút/trạng thái của ứng dụng thật, dùng catalog vi/en của host. Sau khi reader hoạt động, thay biến static bằng document từ `openPage`/session; không tự dựng lại document mới trên mỗi lần build.

## 14. Flutter giữ gì và backend lưu gì?

| Giá trị | Flutter giữ ở đâu? | Nguồn bền vững |
|---|---|---|
| Snapshot vừa tải | `session.document` | Backend repository |
| Base revision | `session.revision` | Save receipt/snapshot response |
| Draft chưa lưu | Session RAM; local store do host bổ sung nếu cần | Chưa có server guarantee |
| Pending operation key | Session cho thao tác chưa xác nhận | Receipt ở backend khi commit |
| Reader theme/scroll state | Widget/preferences của host | Preferences nếu host persist |
| File ảnh/video | Bộ nhớ/cache theo UI | Object storage + asset records ở backend |
| Token/device ID | Auth stack và secure storage của host | Auth/session backend |

SDK Flutter không tự tạo MongoDB/PostgreSQL hoặc tự lưu document vào ổ đĩa. `DisNoteDocumentSession` là state manager/autosave coordinator; dispose hoặc app kill có thể làm mất RAM draft. Persistence thật chỉ được xác nhận khi API lưu thành công và load lại thấy cùng nội dung/revision.

### Dữ liệu qua một lần autosave

1. `load()` gọi `openPage`, nhận `{document, revision}` theo Nest contract và giữ base revision.
2. Bridge gửi canonical document mới vào `acceptEditorChange`.
3. Session kiểm tra document ID và validation, tạo pending key, chờ debounce.
4. `savePage` gửi `document.toJson()`, base `revision`, `idempotencyKey` và optional collaboration fields khi host dùng API trực tiếp.
5. Backend xác thực/quyền/CAS, lưu snapshot và trả revision mới.
6. Session cập nhật revision; chỉ xóa pending nếu không có edit mới xen giữa.
7. Reader/editor tiếp tục dùng draft hiện tại, không remount vì receipt.

Session hiện gọi `savePage` với document/revision/key, không tự điều phối đầy đủ collaboration generation fencing cho mọi tích hợp realtime. Nếu host kết hợp Yjs và canonical save, triển khai coordinator theo backend contract thay vì suy ra session đã lo hết realtime.

### JSON được gửi, không phải một string lồng string

`savePage` tự serialize request. Truyền `DisNoteDocument` vào client, không tự `jsonEncode` rồi bọc thêm vào field document. Khi dùng HTTP stack riêng, body là JSON object; `document` bên trong là object có format/schemaVersion/id/metadata/blocks.

Không gửi `session.status`, widget tree, `TextStyle`, callback, token hoặc bytes ảnh trong document JSON. Những giá trị đó không thuộc canonical model.

## 15. Tích hợp một màn hình có lưu dữ liệu thật

### 15.1. Dependency của màn hình

Ứng dụng host cần cung cấp: API base URI, channel/page ID đã được phép truy cập, auth headers provider, operation-key factory, permission projection và UI lỗi/conflict. Dùng repository/auth DI hiện có để không gọi token storage trực tiếp rải rác trong widget.

Màn hình tạo session một lần trong lifecycle, đăng ký listener, gọi load; không tạo session/client mới trong `build()`. Bố trí editor trong `Expanded` để có constraints. Khi có session document rồi mới dựng editor; loading/error được xử lý trước.

### 15.2. Khi người dùng rời màn hình

Navigation coordinator thực hiện:

```dart
// Hàm của host; dùng trước khi cho phép navigation tiếp tục.
Future<bool> canLeaveDocument(DisNoteDocumentSession session) async {
  try {
    await session.flush();
  } on Object {
    return false;
  }
  return !session.hasUnsavedChanges &&
      session.status != DisNoteSessionStatus.conflict &&
      session.status != DisNoteSessionStatus.failed;
}
```

Nếu trả false, hiển thị lựa chọn giữ draft/thử lại/thoát theo ý người dùng. Chỉ sau khi quyết định xong mới dispose screen-owned session/transport. `flush()` có thể hoàn tất Future nhưng status vẫn conflict/failed; vì vậy kiểm tra trạng thái là cần thiết.

### 15.3. Khi nhận conflict

Sao chép draft JSON trước mọi `load()`/`retry()`:

```dart
final draftBeforeReload = session.document?.toJson();
final baseRevision = session.revision;
// Lưu draftBeforeReload + baseRevision vào draft store nếu cần.
// Chỉ gọi session.load() sau khi người dùng chọn tải bản server.
```

Nếu muốn merge, tải bản server bằng client riêng để không thay draft session trước khi review, giữ cả hai snapshot, tạo merged document hợp lệ rồi quyết định revision/key mới. `adoptServerRevision` không phải thuật toán merge; nó chỉ thay base và schedule save nên có thể overwrite nội dung server nếu host dùng thiếu review.

### 15.4. Cách kiểm tra lưu thành công

Sửa một đoạn → chờ trạng thái ready và hết unsaved → gọi API load lại → xác nhận revision/nội dung → đóng/mở ứng dụng → xác nhận lần nữa. Chạy thêm hai client cùng revision để kiểm tra conflict. Chỉ thấy chữ trên màn hình hoặc callback chạy chưa đủ chứng minh persistence.

## 16. Custom block `consumer.notice` trên Flutter

Schema JSON dùng chung với ví dụ TypeScript:

```json
{
  "id": "block_notice",
  "type": "consumer.notice",
  "version": 1,
  "props": {
    "title": "Lưu ý",
    "message": "Nội dung mẫu",
    "tone": "info"
  }
}
```

Không tự đổi key thành `body` chỉ ở Flutter; backend và React đang dùng `message`. Muốn đổi schema cần version/migration tương ứng.

### 16.1. Parser props và widget custom

```dart
// lib/notice_view.dart
import 'package:material_ui/material_ui.dart';
import 'package:disnote_flutter/disnote_flutter.dart';

const noticeType = 'consumer.notice';

final class NoticeData {
  const NoticeData({required this.title, required this.message, required this.tone});
  final String title;
  final String message;
  final String tone;

  static NoticeData? parse(DisNoteBlock block) {
    final title = block.props['title'];
    final message = block.props['message'];
    final tone = block.props['tone'];
    if (block.type != noticeType || block.version != 1 ||
        title is! String || title.length > 120 ||
        message is! String || message.length > 2000 ||
        (tone != 'info' && tone != 'warning')) {
      return null;
    }
    return NoticeData(title: title, message: message, tone: tone as String);
  }
}

class NoticeView extends StatelessWidget {
  const NoticeView({required this.block, required this.locale, super.key});
  final DisNoteBlock block;
  final String locale;

  @override
  Widget build(BuildContext context) {
    final data = NoticeData.parse(block);
    if (data == null) {
      return Text(DisNoteMessages.forLocale(locale).unknownBlock);
    }
    final colors = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: data.tone == 'warning' ? colors.error : colors.outline),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(data.title, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(data.message),
          ],
        ),
      ),
    );
  }
}
```

Đăng ký builder trên reader:

```dart
DisNoteDocumentView(
  document: document,
  locale: 'vi',
  blockBuilders: {
    noticeType: (context, block) => NoticeView(block: block, locale: 'vi'),
  },
)
```

Custom builder chỉ thay reader. Để server cho lưu notice, registry TypeScript ở backend cần cùng definition hoặc Go host cần validator tương ứng. Dart validator kiểm tra canonical envelope không tự thay thế domain props validation của block này.

### 16.2. Sửa props bằng form Flutter

Sau khi host form đã validate title/message/tone, cập nhật immutable tree và giữ block IDs:

```dart
DisNoteDocument replaceNotice(
  DisNoteDocument document,
  String targetBlockId,
  NoticeData replacement,
) {
  DisNoteBlock rewrite(DisNoteBlock block) {
    final selected = block.id == targetBlockId && block.type == noticeType;
    return DisNoteBlock(
      id: block.id,
      type: block.type,
      version: block.version,
      props: selected
          ? {...block.props, 'title': replacement.title,
             'message': replacement.message, 'tone': replacement.tone}
          : block.props,
      content: block.content,
      children: block.children.map(rewrite).toList(growable: false),
    );
  }
  return document.copyWith(blocks: document.blocks.map(rewrite).toList(growable: false));
}
```

Host xác nhận target tồn tại và replacement hợp lệ trước gọi `session.acceptEditorChange(next)`. Ví dụ function không tự báo khi target không tìm thấy. Giữ metadata/IDs/content/children khác nguyên vẹn; không serialize widget hoặc màu theme vào props.

Nếu WebView editor đang chỉnh cùng document, cần điều phối một writer: kết thúc/flush lượt edit hiện tại, áp dụng form change rồi reset/reinitialize editor bằng snapshot mới theo quyết định host. Không cập nhật âm thầm session trong khi editor cũ vẫn phát draft từ snapshot cũ vì có thể ghi đè props mới. Builder Flutter không tự tạo form bên trong trang React.

## 17. Custom theme, ngôn ngữ, asset và loading/error UI

### Theme reader

`DisNoteRendererTheme` cho padding, blockSpacing, childIndent, breakpoint, textStyle, headingStyles, quote/code/card decorations và maxContentWidth. Đây là widget configuration, không phải document schema. Chỉ persist theme preferences nếu sản phẩm cần, ở user/app settings riêng.

`Theme.of(context)` cung cấp màu light/dark cho built-in/custom renderer. Editor React có theme/CSS riêng trong trang host; đổi Flutter Material theme không tự đổi toàn bộ CSS bên iframe. Muốn đồng bộ, host cần cơ chế theme bridge/route configuration đã thiết kế và kiểm chứng; public Flutter editor hiện không có prop tùy ý truyền toàn bộ CSS tokens.

### Ngôn ngữ

`locale: 'vi'/'en'` chọn bundled messages. `DisNoteMessages` hiện có constructor yêu cầu đầy đủ fields, không có `copyWith` public; nếu cần override, tạo object đầy đủ từ catalog host. Nhãn custom form/dialog ở app dùng i18n app. Text do người dùng nhập không tự dịch khi đổi locale.

### Asset và reference

`assetResolver` trả `Uri?`, không phải Future: host tải/refresh signed URL trước và rebuild reader khi cache thay đổi. Không thực hiện HTTP async trực tiếp như thể callback này trả Future. `onLinkTap` và `onBlockTap` là nơi host mở approved route/resource sau kiểm tra quyền. Nếu URL hết hạn, refresh asset mapping chứ không ghi URL tạm vào document như ID mới.

### Overlay editor

`loadingBuilder/errorBuilder` nhận context, messages và callback retry. Dùng chúng để hiện UI đã dịch theo host, tránh spinner vô hạn không có đường xử lý lỗi. Retry bridge là tải lại kết nối editor; không đồng nghĩa save lại draft hoặc giải quyết conflict session. Hai tầng lỗi cần được trình bày riêng trong state của màn hình.

## 18. Lưu draft local và khôi phục an toàn

SDK chưa tự cung cấp durable draft store cho session. Nếu sản phẩm cần sống qua app kill, host triển khai storage phù hợp với Web/mobile và schema record như sau:

| Field local | Mục đích |
|---|---|
| `draftFormatVersion` | Nâng schema draft store của host |
| `accountId`, workspace/channel/page ID | Scope theo tài khoản và tài nguyên |
| `baseRevision` | Phát hiện draft dựa trên server revision nào |
| `document` | Canonical JSON draft |
| `savedAt` | Hiển thị thời điểm draft cục bộ |
| `pendingOperationKey` và payload tương ứng nếu có | Retry đúng thao tác chưa có receipt |

Không lưu access/refresh token cùng draft. Với dữ liệu nhạy cảm, dùng storage mã hóa/quyền truy cập theo nền tảng; dọn namespace khi logout theo policy. Không xem cache cũ như quyền đọc hiện tại sau khi backend thu hồi quyền.

Khi khởi động:

1. Khôi phục auth, kiểm tra actor có quyền mở page.
2. Load server snapshot và local record thuộc đúng account/page.
3. Parse/validate local JSON; record hỏng không được đưa thẳng vào editor.
4. Nếu không có local thay đổi, dùng server. Nếu có, hiển thị thời điểm/base revision và cho chọn phục hồi/so sánh/bỏ.
5. Nếu base revision khác server, đi qua conflict review; không tự dùng revision mới để overwrite.
6. Chỉ xóa local record sau receipt cho đúng draft generation hoặc quyết định bỏ của người dùng.

Session không có API import toàn bộ pending key/base state tùy ý. Muốn khôi phục một operation đúng nguyên trạng, host cần coordinator/outbox riêng; không giả định gọi `acceptEditorChange` sẽ giữ nguyên key local đã lưu. Khi chỉ phục hồi nội dung vào một session đã load, đây là một thao tác edit mới với key mới, cần review base/server state trước.
