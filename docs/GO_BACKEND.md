# Hướng dẫn backend Go: Gin và Uber Fx

Go SDK nằm ở repository anh em `../DisNote-Go-SDK`; không nằm trong npm package. SDK dùng chung document contract với TypeScript/Flutter. Đọc [kiến trúc](ARCHITECTURE.md) và [TypeScript](TYPESCRIPT.md) nếu cần frontend hoặc backend NestJS hiện tại.

## 1. Phạm vi hiện có

| Package Go | Vai trò |
|---|---|
| `document` | Document, block, inline và metadata |
| `validation` | Validation input, URL, marks, depth và cấu trúc block |
| `canonicaljson` | Canonical encoding/checksum dùng fixture đối chiếu |
| `revision` | Service create/get/save draft, CAS và repository/policy ports |
| `storage/mongo` | MongoDB driver v2 adapter |
| `storage/postgres` | Adapter `database/sql`, JSONB và unique constraints |
| `transport/gin` | HTTP adapter Gin |
| `fxmodule` | Uber Fx composition tham chiếu |
| `collaboration` | Token/control protocol và opaque update-store boundary |

Model có status/published fields không có nghĩa Go đã implement publish/history REST đầy đủ. Chưa xem SDK này là bản thay thế drop-in của mọi API Node/NestJS, database/workspace/comments/automation, renderer hay DOCX engine.

## 2. Cài đặt và chạy từ source

Module path trong `go.mod` là `github.com/DisNote-Project/disnote-go`, yêu cầu Go `1.25.0`. Dependencies khai báo Gin `1.12.0`, Fx `1.24.0` và MongoDB driver v2 `2.10.0`; đối chiếu lại `go.mod`/`go.sum` của checkout khi nâng cấp.

```bash
# Khi module/tag đã public và có thể truy cập:
go get github.com/DisNote-Project/disnote-go@v0.1.0
```

Chưa có public tag thì dùng module local trong ứng dụng consumer:

```bash
go mod edit -require=github.com/DisNote-Project/disnote-go@v0.0.0
go mod edit -replace=github.com/DisNote-Project/disnote-go=../DisNote-Go-SDK
go mod tidy
```

Đường dẫn replace tính từ module consumer. Local replace không phải release dependency; bỏ hoặc thay bằng public version trước khi phát hành ứng dụng cần build độc lập.

## 3. Kiến trúc ứng dụng host

| Tầng | Trách nhiệm |
|---|---|
| Gin handler | Bind request, lấy trusted actor, map lỗi HTTP |
| Application service | Kiểm tra quyền, validation, revision/idempotency orchestration |
| Repository port | Read, find slug/locale, atomic write với CAS |
| Mongo/PostgreSQL adapter | Thực hiện constraint và compare-and-swap |
| Composition root/Fx | Kết nối policy, repository, service, route và lifecycle |

Không để Gin handler trực tiếp truy vấn database. Không lấy actor từ body. Policy phải dùng context đã xác thực, workspace membership và quyền hiện tại; không dùng implementation luôn `true` cho production.

## 4. Tạo service qua dependency injection

Ví dụ dưới đây là composition function. Host truyền repository và policy thật vào; không ẩn dependency trong handler:

```go
package documents

import (
    "github.com/DisNote-Project/disnote-go/revision"
    "github.com/DisNote-Project/disnote-go/validation"
)

func NewService(repo revision.Repository, policy revision.Policy) *revision.Service {
    validator := validation.New(validation.Options{})
    return revision.NewService(repo, validator, policy)
}
```

`revision.Policy` có phương thức `Can(context.Context, actor string, action revision.Action, documentID string) (bool, error)`. Các action là create/read/write. `nil` policy bị service từ chối; policy có lỗi phải truyền lỗi, không fallback allow.

Với test/demo, `revision.NewMemoryRepository()` cung cấp repository trong bộ nhớ; host vẫn phải inject policy. Không dùng memory repository làm persistence production.

## 5. Nhận canonical document

```go
package documents

import (
    "encoding/json"
    "errors"
    "github.com/DisNote-Project/disnote-go/document"
    "github.com/DisNote-Project/disnote-go/validation"
)

func Decode(raw []byte) (document.Document, error) {
    var doc document.Document
    if err := json.Unmarshal(raw, &doc); err != nil { return doc, err }
    validator := validation.New(validation.Options{})
    if issues := validator.Validate(doc); len(issues) != 0 {
        return doc, errors.New("document.invalid")
    }
    return doc, nil
}
```

HTTP server cần giới hạn body trước decode. Giữ kiểu JSON/optional-field presence; không tự chuyển document qua Markdown rồi lưu ngược. Go validator hiện không có registry props tùy biến trong Options (chỉ có MaxDepth). Với custom block, bổ sung validator nghiệp vụ ở service host và đối chiếu fixture liên runtime.

`canonicaljson.Checksum(doc)` trả checksum và error. Dùng bộ fixture chung để đối chiếu, không tự thay bằng checksum từ `fmt.Sprint` hoặc JSON encoder có hành vi khác.

## 6. Create, read và save draft

```go
// ctx, service, doc, actor và operationKey do application layer cung cấp.
stored, err := service.Create(ctx, revision.CreateInput{
    Document: doc, Slug: doc.ID, Locale: "vi",
    Kind: "ARTICLE", Title: "Ví dụ", Actor: actor,
})
if err != nil { return err }

state, err := service.Get(ctx, actor, stored.ID)
if err != nil { return err }
if state == nil { return revision.ErrInvalid }

result, err := service.SaveDraft(ctx, revision.SaveDraftInput{
    DocumentID: stored.ID, Document: doc, Actor: actor,
    ExpectedRevision: state.Stored.CurrentRevision,
    IdempotencyKey: operationKey,
})
if err != nil { return err }
if !result.OK {
    // result.Reason: not-found hoặc revision-conflict.
    // Không tự đổi ExpectedRevision rồi ghi đè.
}
```

Đây là đoạn thân của application function trả `error`, không phải chương trình độc lập. Service validate document, yêu cầu document ID khớp target, kiểm tra policy và ghi revision mới. CAS retry nội bộ có giới hạn; không thay thế giải quyết xung đột nội dung.

### Idempotency: ranh giới cần host bổ sung

Service hiện lưu `map[string]uint64` theo idempotency key trong state. Key đã có sẽ trả revision cũ, chưa tự ràng buộc key với actor hoặc checksum payload. Host cần:

- Tạo key khó trùng cho mỗi thao tác; giữ nguyên key khi retry đúng thao tác đó.
- Ràng buộc actor/document/payload và từ chối cùng key cho payload khác.
- Có retention/giới hạn receipt để state không tăng vô hạn.

Không mô tả receipt map hiện tại là bảo vệ đầy đủ khỏi key reuse giữa các actor.

## 7. Expose HTTP bằng Gin

```go
package documents

import (
    "github.com/gin-gonic/gin"
    "github.com/DisNote-Project/disnote-go/revision"
    gintransport "github.com/DisNote-Project/disnote-go/transport/gin"
)

const BasePath = "/api/documents"

func Register(router *gin.Engine, authenticate gin.HandlerFunc, service *revision.Service) {
    routes := router.Group(BasePath)
    routes.Use(authenticate)
    gintransport.NewHandler(service).Register(routes)
}
```

Middleware `authenticate` phải verify session/token và đặt actor đã xác thực tại Gin context key `disnote.actor`. Dùng constant cho key trong host. Adapter không tự cấp token, refresh session hoặc xác thực Google OAuth.

| Method và route theo ví dụ | Request | Response thành công |
|---|---|---|
| `POST /api/documents` | `document`, `slug`, `locale`, `kind`, `title` | HTTP 201, `StoredDocument` |
| `GET /api/documents/:documentId` | Trusted actor | HTTP 200, toàn bộ `State` |
| `PUT /api/documents/:documentId/draft` | `document`, `expectedRevision`; header `Idempotency-Key` | HTTP 200, `SaveDraftResult` |

`GET` adapter hiện trả state gồm revisions và receipt map. Trước khi expose ra public API, nên viết presenter/DTO thu hẹp về dữ liệu consumer cần và chính sách history thích hợp; đừng dùng state nội bộ làm hợp đồng dài hạn mà không review.

| Trường hợp | HTTP hiện tại |
|---|---|
| Không có trusted actor | 401 |
| Body/document không hợp lệ | 400 |
| Policy từ chối | 403 |
| Không tìm thấy | 404 |
| Revision/store conflict | 409 |
| Lỗi không được phân loại | 500 |

Go adapter dùng `expectedRevision` và header key. Flutter `DisNoteNestClient` dùng route document-channel, body `revision`/`idempotencyKey` và response envelope khác. Muốn Flutter gọi Go phải viết transport/API adapter tương thích; cùng document format chưa đủ để gọi HTTP trực tiếp.

## 8. MongoDB

```go
import mongostore "github.com/DisNote-Project/disnote-go/storage/mongo"

repo := mongostore.New(collection)
if err := repo.Initialize(ctx); err != nil { return err }
// Inject repo as revision.Repository vào service.
```

Host cung cấp `*mongo.Collection` của official driver v2. `Initialize` tạo unique index ID và slug/locale. Insert trùng hoặc update CAS không match không được coi là ghi thành công. Host sở hữu client, context deadline, write concern và transaction khi thao tác trải qua aggregate khác.

## 9. PostgreSQL

```go
import pgstore "github.com/DisNote-Project/disnote-go/storage/postgres"

repo, err := pgstore.New(db, "")
if err != nil { return err }
if err := repo.Initialize(ctx); err != nil { return err }
```

Host cung cấp `*sql.DB` và đăng ký PostgreSQL driver, ví dụ driver tương thích `database/sql`. Chuỗi table rỗng chọn `disnote_document_states`; tên tùy biến phải qua validator của adapter. State được lưu JSONB cùng revision, slug, locale; constraint `(slug, locale)` là unique.

Hai adapter lưu aggregate có lịch sử. Đo kích thước document/state và thiết kế retention trước khi dùng cho lịch sử lớn; không xóa revision tùy tiện làm hỏng receipt/history contract.

## 10. Uber Fx

`fxmodule.Module` cung cấp validator, memory repository dưới interface, revision service và Gin handler. Nó **không** tạo `*gin.Engine`, không cung cấp policy và không tự mở HTTP listener.

Host cần cung cấp `revision.Policy`, router và lifecycle server. Với repository production, thay binding interface bằng `fx.Decorate` hoặc tự compose module riêng từ các constructor; tránh đăng ký hai provider cùng `revision.Repository` gây lỗi DI.

```go
// hostPolicy trả revision.Policy, hostRouter trả *gin.Engine.
app := fx.New(
    fxmodule.Module,
    fx.Provide(hostPolicy, hostRouter),
    fx.Invoke(registerDocumentRoutes),
    fx.Invoke(registerHTTPServerLifecycle),
)
app.Run()
```

Các hàm `host*`/`register*` là code của host. Dùng `fx.Lifecycle` để Start server, Shutdown theo context, đóng database và propagate lỗi. `app.Run()` không tự phục vụ HTTP nếu chưa đăng ký lifecycle listener.

## 11. Collaboration và tương thích

Package collaboration có token/control packet và update-store boundary. Yjs updates được xem là binary opaque; Go SDK chưa cung cấp semantic Yjs merge/compaction tương đương runtime JS. Không decode update thành JSON document bằng giả định riêng.

Chạy từ repository TypeScript khi đổi fixture:

```bash
npm run contracts:export
```

Review thay đổi fixture ở cả hai SDK. Chạy checksum/validation conformance bên Go và Dart; kiểm chứng seed, replay, revoke và CAS/generation fence trước khi mở realtime cho production.

## 12. Kiểm tra, phát hành và troubleshooting

Chạy tại `DisNote-Go-SDK`:

```bash
go version
go mod tidy
gofmt -l .
go test ./...
go test -race ./...
go vet ./...
```

`-race` cần toolchain/platform hỗ trợ; báo rõ nếu thiếu C toolchain. `gofmt -l` chỉ liệt kê, không sửa file. Live Mongo/PostgreSQL cần suite integration và database chạy thật; unit memory pass không chứng minh adapter production.

Phát hành Go bằng semantic Git tag tại repository có module path đúng, không qua npm/pub.dev. Sau khi gate pass và public remote sẵn sàng, maintainer mới tạo/push `v0.1.0` hoặc version mới. Consumer cài bằng `go get ...@version`; không khẳng định tag tồn tại nếu chưa kiểm tra remote.

| Lỗi | Kiểm tra |
|---|---|
| `go get` không thấy module/tag | Public remote, module path, version và credentials/network |
| Fx thiếu `revision.Policy` | Host chưa cung cấp policy theo đúng interface |
| Fx trùng repository provider | Thay binding thay vì thêm provider thứ hai |
| 401 trên Gin | Middleware đã verify và set `disnote.actor` chưa |
| 403 từ service | Action/document scope của policy, không bypass policy |
| 409 hoặc result không OK | Revision mới nhất và thao tác đang retry |
| Flutter không parse response Go | Viết adapter HTTP vì Nest client không dùng contract Gin |
| Ghi thành công nhưng restart mất | Đang dùng memory repository |
