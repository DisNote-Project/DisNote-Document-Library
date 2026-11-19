# Phát hành phiên bản mới lên npm

Repository có ba gói public: `@disnote/core`, `@disnote/react`, `@disnote/sheets`.
Root là private. Không chạy `npm publish` trực tiếp tại root.

## Phiên bản

Ngày 19/11/2026, manifest local: core `0.7.0`, React `0.1.0`, sheets `0.1.0`.
`npm run release:status` xác nhận cả ba có changeset minor đang chờ.
Dự kiến sau versioning: core `0.8.0`, React `0.2.0`, sheets `0.2.0`.
Manifest/changelog sau versioning là kết quả chính thức. Chưa xác minh version
registry hiện tại vì terminal không kết nối được npm.
Xem [kết quả kiểm tra](RELEASE_READINESS_2026-11-19.md).

## Cách khuyến nghị: GitHub Actions

1. Tài khoản npm cần quyền publish scope `@disnote` cho cả ba gói và đáp ứng
   [yêu cầu xác thực/2FA](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/).
2. GitHub repository → Settings → Secrets and variables → Actions: cấu hình
   `NPM_TOKEN` có quyền publish phù hợp. Không ghi token vào source/chat.
3. Push main chạy workflow **Release packages**, tạo/cập nhật PR version.
   Nếu bị chặn tạo PR, bật quyền Actions tạo PR trong Settings → Actions → General.
4. Review version/changelog/lockfile và dependency React → core mới.
5. Chờ CI thành công, gồm MongoDB integration và E2E, rồi merge PR version.
6. Workflow chạy preflight, verify, E2E, pack-check, publish và push tags.
   Kiểm tra registry để xác nhận; push source không đồng nghĩa đã publish.

Workflow hiện dùng token. [Trusted publishing](https://docs.npmjs.com/trusted-publishers/)
cần cấu hình riêng trên npm và sửa workflow nếu chuyển sang OIDC.

## Phát hành thủ công bằng PowerShell

Tạm disable workflow **Release packages** để tránh publish đồng thời.
Chạy từng lệnh, dừng nếu lỗi:

```powershell
Set-Location D:\code\DISNOTE\DisNote-Document-Library
git pull --ff-only
npm ci
npm run release:status
npm run version-packages
git diff
```

Review version/changelog và dependency core của React trước khi tiếp tục:

```powershell
npm run verify
npm run test:e2e
npm run release:pack-check
git add .changeset packages/disnote packages/react packages/sheets package-lock.json
git diff --cached --check
git commit -m "chore: version document packages"
git push origin main
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm run release
```

`npm run release` không tự tăng version. Preflight đòi main sạch, khớp origin/main,
đăng nhập npm và version chưa tồn tại của cả ba gói. Xác thực trong terminal/trình
 duyệt khi npm yêu cầu. Nếu publish gián đoạn, kiểm tra gói nào đã publish trước
khi xử lý tiếp; version đã publish không thể ghi đè. Bật lại workflow sau khi xong.

## Xác nhận và sử dụng

```powershell
npm view @disnote/core version
npm view @disnote/react version
npm view @disnote/sheets version
npm view @disnote/react dependencies --json
```

Trong ứng dụng tiêu thụ, cài gói phù hợp sau khi xác nhận publish thành công:

```powershell
npm install @disnote/react@latest
# Nếu ứng dụng dùng trực tiếp các gói này:
npm install @disnote/core@latest @disnote/sheets@latest
```

```tsx
import { DocumentEditor } from '@disnote/react';
import '@disnote/react/styles.css';
```

Dependency `file:vendor/...tgz` phải đổi sang version npm để nhận bản mới.
Xem [tích hợp React và CSS](REACT_INTEGRATION_AND_CSS.md).
