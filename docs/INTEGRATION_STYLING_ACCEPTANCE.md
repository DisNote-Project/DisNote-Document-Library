# Integration and CSS acceptance

| ID | Requirement | Evidence / status |
|---|---|---|
| STYLE-01 | Easy React integration without a mandatory registry or seed document | Proven: new `@disnote/react` installs compatible runtime dependencies; empty editor, optional registry, callbacks and refs; clean consumer typecheck/build/browser with no overrides |
| STYLE-02 | CSS customization without vendor selectors or global changes | Proven: optional scoped CSS, typed DisNoteStyle/public tokens, additive classes/data attributes; desktop/Pixel computed-color/font/padding/radius and ordinary heading CSS checks |
| STYLE-03 | Isolated instances, dynamic styles and dark appearance | Proven: independent default sibling, dynamic appearance and preserved edited text; three SSR tests include old theme compatibility and pre-hydration loading |
| STYLE-04 | Read-only consumers do not fetch editor runtime/vendor CSS | Proven: dedicated `@disnote/core/react/view`, clean install/build with no BlockNote installed; runtime DOM/network checks in demo and clean consumer |
| STYLE-05 | Packaged and documented consumer contract | Proven locally: core 39 valid exports, React package 3 valid exports; CSS side effects/files included; clean consumer and standalone demo. New package remains unpublished |

Scope: React editor/renderer styling. Document content colors remain semantic
formatting. This does not introduce a new backend or alter persisted document JSON.

Fresh receipt — 2026-10-15: SDK `npm run verify` exits 0 (157 unit passes,
8 opt-in Mongo skips; lint, package/examples/Storybook builds). SDK browser:
29 pass/1 viewport-only skip. Demo build and 2 live-Mongo/validation tests pass;
all 10 desktop/Pixel browser cases pass, including CSS controls, reader isolation,
existing editor, Mongo and actual AI inference. Two isolated consumer builds
and Chromium checks pass without application dependency overrides. Reader has
no editor peers installed. Root production audit reports zero advisories.
Nonfatal chunk-size warnings remain. Native-device and full framework-matrix
coverage are not claimed. Logs: `.styling-verify.log`, `.styling-e2e.log`; demo
`.styling-build.log`, `.styling-tests.log`, `.styling-full-browser.log`; clean
consumer receipts under workspace `.codex-qa/document-*-package-smoke/`.

Push/release preparation receipt — 2026-10-15: fresh `npm run verify`
exits 0 (157 passes/8 Mongo skips), fresh `npm run test:e2e` exits 0
(29 passes/1 viewport skip), and dry-run packaging of both workspaces exits 0.
Logs: `.npm-push-verify.log`, `.npm-push-e2e.log`,
`.npm-push-core-pack.log`, `.npm-push-react-pack.log` (local ignored receipts).

| ID | Release requirement | Evidence / status |
|---|---|---|
| RELEASE-01 | Push authorized library changes to main | Pending remote confirmation in the shared project context after commit/push; fresh quality gates above |
| RELEASE-02 | Explain npm versioning, authentication, package order and consumer update | `PUBLISH_NPM_VI.md` covers existing CI and manual Changesets release, core dependency bump, scope/2FA and file-tarball demo migration; no npm publish performed by this preparation |
