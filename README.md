# DisNote Document and Sheets

Thư viện tài liệu dùng canonical JSON model, editor React, renderer đa nền tảng,
storage contracts và SDK Flutter/Go. Spreadsheet là engine độc lập.

## Bốn tài liệu chính

| Tài liệu | Nội dung |
|---|---|
| [Kiến trúc](docs/ARCHITECTURE.md) | Model, module, luồng dữ liệu, bảo mật và mở rộng |
| [TypeScript](docs/TYPESCRIPT.md) | React, React Native, backend Node.js/NestJS và npm |
| [Backend Go](docs/GO_BACKEND.md) | Go SDK, Gin, Uber Fx, repository và HTTP contract |
| [Frontend Flutter](docs/FLUTTER.md) | Web/Android/iOS, reader, editor bridge, NestJS và pub.dev |

## Packages

| Package | Mục đích |
|---|---|
| @disnote/core | Model, validation và các subpath editor/renderer/storage |
| @disnote/react | Facade editor React và CSS |
| @disnote/sheets | Headless spreadsheet engine |
| sdks/flutter | Package Dart/Flutter disnote_flutter |
| ../DisNote-Go-SDK | Module Go độc lập cho backend |

Các package dùng document contract chung; HTTP API và mức hỗ trợ UI khác nhau
ở mỗi nền tảng. Phiên bản trong source không xác nhận đã phát hành lên registry.

## Phát triển

Chạy npm ci, npm run build, npm test và npm run verify tại repository root.
Browser E2E chạy riêng bằng npm run test:e2e; Flutter và Go có gate riêng trong
hướng dẫn tương ứng. Cấu hình database/runtime trước các kiểm tra cần môi trường.

## Giấy phép

Apache-2.0. Xem [LICENSE](LICENSE) và
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) cho dependencies và editor vendor.
