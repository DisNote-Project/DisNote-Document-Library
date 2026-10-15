# Cập nhật thư viện trên npm

Repository phát hành hai gói public: `@disnote/core` và `@disnote/react`.
Root workspace là private, không chạy `npm publish` tại root.

## Trạng thái kiểm tra ngày 2026-10-15

- npm public registry: `@disnote/core` đang ở `0.6.1`; `@disnote/react` trả về 404 (chưa có bản public truy cập được).
- Source: core `0.7.0`, React `0.1.0`; hai changeset đang chờ phát hành.
- `npm run release:status` yêu cầu minor cho cả hai gói. Khi áp dụng trên source này, dự kiến core `0.8.0`, React `0.2.0`; lấy manifest sau versioning làm kết quả chính thức.
- Push Git không đồng nghĩa đã publish npm. Tài liệu này không xác nhận quyền tài khoản npm hoặc cấu hình secret GitHub.

## Cách khuyến nghị: workflow GitHub đã có

1. Đăng nhập npm bằng tài khoản có quyền publish trong scope `@disnote`. Gói scoped public cần cấu hình access public; repository đã có cấu hình này. Đáp ứng yêu cầu xác thực publish/2FA của npm theo [tài liệu npm](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/).
2. Trong GitHub repository, mở **Settings → Secrets and variables → Actions** và cấu hình secret `NPM_TOKEN` có quyền publish hai gói. Token dùng cho CI phải đáp ứng chính sách 2FA của tài khoản/tổ chức; không ghi token vào source, README hoặc chat.
3. Workflow [Release packages](../.github/workflows/release.yml) chạy khi push `main`, tạo hoặc cập nhật PR `changeset-release/main`. Nếu tạo PR bị chặn, bật quyền cho GitHub Actions tạo PR trong Settings → Actions → General.
4. Kiểm tra PR: version/changelog của cả hai gói, và dependency `packages/react/package.json` phải trỏ tới phiên bản core mới (dự kiến `^0.8.0`). Gói React cần các export mới nên không được phát hành với dependency chỉ trỏ core cũ.
5. Trước khi merge, chạy `npm ci`, `npm run verify` và `npm run test:e2e` trên nhánh PR. Merge PR sau khi các bước này thành công. Workflow trên `main` sẽ kiểm tra preflight, verify, chạy `changeset publish` và đẩy tag. Changesets sắp thứ tự package theo dependency: core trước React.
6. Kiểm tra job thành công và kiểm tra phiên bản trên registry bằng các lệnh ở cuối tài liệu.

Không merge release PR đồng thời với một lần publish thủ công. Workflow hiện dùng token; nếu chuyển sang OIDC cần cập nhật workflow và cấu hình riêng theo [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## Phát hành thủ công từ PowerShell

Để tự publish thay vì workflow: tạm disable workflow **Release packages** trong tab Actions, rồi thực hiện trên `main` sạch và đồng bộ. Không merge release PR trong lúc thực hiện.

```powershell
Set-Location D:\code\DISNOTE\DisNote-Document-Library
git pull --ff-only
npm ci
npm run release:status
npm run version-packages
git diff
```

Kiểm tra version/changelog và dependency core của React như bước 4 phía trên. Script version-packages cập nhật cả lockfile. Mỗi lệnh sau phải thành công trước khi chạy lệnh tiếp theo:

```powershell
npm run verify
npm run test:e2e
npm pack --workspace @disnote/core --dry-run
npm pack --workspace @disnote/react --dry-run
git add .changeset packages/disnote packages/react package-lock.json
git diff --cached --check
git commit -m "chore: version document packages"
git push origin main
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm run release
```

`npm run release` đòi working tree sạch, nhánh main khớp origin/main và phiên bản core chưa tồn tại; nó không tự tăng version. Sau preflight, script chạy verify, publish qua Changesets và push tags. Xác thực OTP trong terminal/trình duyệt nếu npm yêu cầu. Preflight hiện chỉ kiểm tra manifest core; đối chiếu React trong release PR/manifests và kết quả publish. Khi xong có thể enable lại workflow. Nếu publish bị gián đoạn, xem package nào đã lên registry trước khi chạy lại; một version đã publish không thể ghi đè bằng code khác.

## Xác nhận và cập nhật ứng dụng sử dụng thư viện

```powershell
npm view @disnote/core version
npm view @disnote/react version
npm view @disnote/react dependencies --json
```

Trong repository ứng dụng, sau khi cả hai gói đã xuất hiện trên npm:

```powershell
npm install @disnote/react@latest
```

Nếu ứng dụng có dependency trực tiếp `@disnote/core`, cập nhật thêm `npm install @disnote/core@latest`. Demo hiện dùng tarball `file:vendor/...`; muốn dùng npm phải thay dependency tarball bằng bản registry, không chỉ chạy `npm update` trên dependency `file:`.

```tsx
import { DocumentEditor } from '@disnote/react';
import '@disnote/react/styles.css';
```

Xem [hướng dẫn tích hợp và custom CSS](REACT_INTEGRATION_AND_CSS.md) cho style tokens, dark mode và reader entry. Quyền scope/public package được mô tả trong [hướng dẫn npm organization packages](https://docs.npmjs.com/creating-and-publishing-an-organization-scoped-package/).
