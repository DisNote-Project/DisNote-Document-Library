# DisNote Document Library - Hướng dẫn đọc và phát triển

## 1. Repo này là gì?

Đây là TypeScript monorepo xây dựng document model và các adapter dùng chung cho DisNote.
Package phát hành chính là `@disnote/core`, với nhiều subpath exports:

- Core document model, validation, migration và serialization.
- Editor adapter và React editor UI.
- React/HTML/native renderer.
- Import/export Markdown, HTML và clipboard.
- Storage contracts.
- Asset upload.
- Collaboration/Yjs.
- Comments.
- Search/AI projection.
- Legal domain helpers.
- Presets và testing utilities.

Mục tiêu quan trọng nhất: dữ liệu document không bị khóa vào một editor vendor.

## 2. Bắt đầu đọc từ đâu?

Thứ tự đề xuất:

1. `README.md`
2. `docs/BAT_DAU_CHO_NGUOI_MOI.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DOCUMENT_FORMAT_V1.md`
5. `docs/LIBRARY_MECHANISM.md`
6. `docs/VERIFICATION.md`

Tutorial học sâu nằm ở repo sibling `document-library-tutorial`.

## 3. Cấu trúc monorepo

```text
packages/disnote/
├── src/
│   ├── core/               # Stable document contract
│   ├── editor/             # Vendor adapter + React UI
│   ├── renderer-react/
│   ├── renderer-html/
│   ├── renderer-native/
│   ├── import-export/
│   ├── storage/
│   ├── assets/
│   ├── collaboration/
│   ├── comments/
│   ├── search-ai/
│   ├── legal/
│   ├── presets/
│   └── testing/
└── test/                   # Contract, security, round-trip, SSR tests

examples/
├── react-demo/
├── nextjs-demo/
├── legal-service-nest/
├── collaboration-server/
└── editor-engine-lab/
```

## 4. Dependency direction

```text
Core document model
↑
validation/migration/traversal
↑
storage/render/import-export contracts
↑
React/editor/collaboration adapters
↑
consumer examples
```

Core không được import React, BlockNote, NestJS hoặc database driver. Adapter có thể phụ
thuộc core; core không phụ thuộc adapter.

## 5. Vòng đời document

```text
Editor vendor state
→ editor adapter
→ DisNoteDocument
→ validate + migrate
→ repository save/revision
→ load
→ validate + migrate
→ renderer/editor adapter
```

Không persist raw vendor JSON làm nguồn dữ liệu chính. Document phải đi qua validation ở
mọi boundary không đáng tin cậy.

## 6. Khi thêm block mới

Đọc `docs/BLOCK_DEVELOPMENT.md`, sau đó kiểm tra:

1. Model/type và registry.
2. Validation.
3. Migration/defaults nếu schema thay đổi.
4. Plaintext/canonical serialization.
5. React renderer.
6. HTML renderer và sanitization.
7. Native renderer nếu hỗ trợ.
8. Editor conversion hai chiều.
9. Import/export.
10. Fixtures, round-trip và security tests.

Block mới không hoàn thành nếu editor tạo được nhưng renderer hoặc migration không hiểu.

## 7. Public exports

Public API được kiểm soát bởi `packages/disnote/package.json` và các `index.ts`.
Không để consumer import deep path nội bộ chưa export. Khi đổi public API:

- xem semantic version;
- thêm changeset;
- cập nhật test/example;
- kiểm tra tree-shaking và browser/server boundary.

## 8. Lệnh phát triển

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run build:examples
npm run build-storybook
```

Quality gate đầy đủ:

```bash
npm run verify
```

E2E và integration:

```bash
npm run test:e2e
npm run test:mongo
```

## 9. Release

Đọc `docs/RELEASING.md`.

```bash
npm run changeset
npm run release:status
npm run release:dry-run
```

Không publish khi chưa chạy verify, consumer examples và package dry-run.

## 10. Quy tắc an toàn dữ liệu

- Mọi schema change cần migration.
- Canonical serialization/checksum phải deterministic.
- HTML renderer/import phải chống XSS.
- URL và asset cần validate protocol/magic bytes.
- Storage adapter phải tuân cùng repository contract tests.
- Collaboration update/snapshot cần version và idempotency.
- Round-trip test là bắt buộc cho editor adapter.

## 11. Checklist

- [ ] Core không phụ thuộc framework/vendor.
- [ ] Public export được chủ ý.
- [ ] Migration xử lý document cũ.
- [ ] Renderer/editor/import-export đồng bộ.
- [ ] Security và round-trip tests được thêm.
- [ ] Changeset có mặt nếu public package thay đổi.
- [ ] `npm run verify` chạy qua.
