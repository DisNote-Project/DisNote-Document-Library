# Document library completion ledger

User authorization: implement all twelve gaps identified in the source audit.
Scope: reusable library APIs, React surfaces and reference adapters. Product identity,
production storage deployment and AI credentials must remain injected boundaries.
No row is complete solely because a type or widget exists.

| ID | Acceptance | Status | Required evidence |
|---|---|---|---|
| GAP-01 | Typed records, CRUD, filters, sort, groups, pagination, functional database views | proven at library boundary | `src/database`; five domain tests cover validation, queries, row policy and CAS; browser CRUD/reload and six-view regression; IndexedDB reference persistence |
| GAP-02 | Safe formula AST, relations, rollups with read authorization | proven at library boundary | Database tests cover hidden relations/rollups, computed sorting, cycles and invalid arithmetic; bounded AST without dynamic code execution |
| GAP-03 | Pages, cycle-safe moves, breadcrumbs, backlinks, trash/restore | proven at library boundary | `src/workspace`, workspace tests for atomic moves/cycles, visibility and trash; browser create/open/trash/restore/reload |
| GAP-04 | Shared block source, updates, resolution, unsync, cycle limits | proven at library boundary | Workspace source tests cover permissions, projection IDs and independent unsync; browser dialog edit updates both occurrences and survives reload, Escape restores focus |
| GAP-05 | Editor Yjs binding, awareness, reconnect, concurrent edits | partial deployment | `src/collaboration/browser`, lazy collaborative editor; two-browser convergence/reconnect; real local authenticated WebSocket fixture covers presence/offline replay; production identity/revocation and live Mongo server remain unverified |
| GAP-06 | Comment UI, persistence contract, notifications, moving anchors | partial integration | `src/comments`; browser reply/resolve/reload; service tests prove policy/CAS and atomic notification outbox; range-remapping utility exists, but host editor mappings and notification delivery must be integrated |
| GAP-07 | Templates and authorized atomic button actions | proven at library boundary | `src/actions`, workspace templates, React action controls; tests prove regenerated nested IDs, atomic multi-domain rollback, policy and actor-scoped idempotency; host composite repository must preserve transaction contract |
| GAP-08 | Revision comparison/restore, trash/recovery | proven at library boundary | `src/storage/revision-repository.ts`, history service/UI and IndexedDB adapter; nine repository tests plus restore test; browser restore appends durable revision; published pointer preserved |
| GAP-09 | Durable offline edits and conflict-safe resynchronization | proven at library boundary | `src/offline`, `OfflineEditor`; domain retry/conflict regression, blob-cache validation; browser IndexedDB reload and queue drain; service worker app shell and host identity/cache scoping remain host responsibilities |
| GAP-10 | Permission-filtered search and injected AI execution/preview | partial integration | `src/search-ai` and React controls; service tests prove permission filtering, stale projections, provider validation and stale confirmation; no live model/provider call or product search backend verified |
| GAP-11 | Multi-document/assets interchange, Notion import, PDF export | partial format coverage | `src/import-export`; canonical bundle and ZIP round trips, asset/hierarchy preservation, traversal/size rejection and Notion-loss warnings tested; system print UI exists, but generated PDF artifact is unverified |
| GAP-12 | Mobile editing integration and native verification | partial native coverage | `src/mobile`, `MobileEditorBridge`; serialization/security tests and browser bootstrap/edit/foreign-origin rejection; Pixel browser editor tests; Android/iOS keyboard, files and native offline remain unverified |
| I18N-01 | Complete vi/en editor and renderer messages | proven for library catalog | Typed en/vi catalogs and dictionary parity tests; Vietnamese browser controls; vendor BlockNote dictionary selected at mount, host must remount when switching it |

## Implementation map and boundaries

Paths in the table are relative to `packages/disnote/`. The integration contracts,
public imports, policy requirements and adapter examples are maintained in
[`WORKSPACE_CAPABILITIES.md`](WORKSPACE_CAPABILITIES.md). The runnable reference
composition is `examples/react-demo/src/parity/runtime.ts`; its policies are
allow-all fixtures, not production authorization. Browser evidence lives in
`e2e/parity.spec.ts`; domain evidence lives in `packages/disnote/test/`.

This ledger does not claim complete Notion product parity. Database formulas use
a safe AST subset, calendar/timeline/map operate on the current query page, and
the map is a coordinate projection rather than a street map. Snapshot repositories
are reference implementations, not production indexed query engines. JSON Yjs
documents and BlockNote XML editor state use distinct bindings; the JSON adapter
rejects accidental XML binding use.

Canonical ZIP exports retain page documents, assets, database snapshots and shared
sources, but do not archive comments, revision histories or notification receipts.
Notion CSV cannot reconstruct types, formulas, relations, rollups or saved views.
AI confirmation requires a host CAS commit; comment anchors require host edit
mappings; authenticated adapters must obtain actors from trusted server identity.
The editor does not provide service-worker app-shell caching or native file storage.

Remaining integration queue: production policy/HTTP/persistence adapters; notification
dispatcher and editor anchor mappings; live AI/search provider; live Mongo
collaboration rehearsal; PDF artifact QA; Android/iOS WebView and file/offline QA.
These are explicit partial rows, not completed deployment claims.

## Prior library verification receipt — 2026-10-15

- `npm run verify`: exit 0 on the latest source; strict typecheck, zero-warning
  ESLint, library build, Nest/Mongo/collaboration example typechecks, Vite demo,
  Next.js demo and Storybook build passed. Unit total: 161, passed: 153, failed: 0,
  skipped: 8 (Mongo integration requires `DISNOTE_TEST_MONGO_URI`).
- `npm run test:e2e`: exit 0; 29 passed, 1 skipped in 54.7 seconds. The skip is
  the mobile-only overflow case in the desktop project. Desktop Chromium and
  Pixel viewport exercise the library/reference demo, not the authenticated
  DisNote application or an Android/iOS runtime.
- Shared-source edit dialog screenshots were visually inspected on desktop and
  mobile: dialog stays within the viewport, editable content/buttons remain
  visible, and the underlying page is covered by the modal backdrop. This is
  reference UI QA, not current-Figma or assistive-technology proof.
- `npm audit --omit=dev --json`: exit 0; production advisory counts are all zero.
  This result does not assert that development dependencies have zero advisories.
- `npm pack --workspace @disnote/core --dry-run --ignore-scripts --json`: exit 0;
  621 entries, 1,205,962 unpacked bytes; all 34 public export targets exist and
  README, LICENSE, notices and editor runtime are present. No package published.
- `git diff --check`: exit 0. Vite/Storybook emit nonfatal chunk-size warnings.

Command logs are local `.parity-verify.log` and `.parity-e2e.log`; generated
Playwright evidence is under `test-results/`. No commit, push or production
deployment was performed for this checkpoint.

## Product integration continuation — 2026-10-15

The prior provider/deployment gaps now have concrete host implementations in
`DisNote-Backend` and `fe`: authenticated channel/document policy, actual Mongo
CRUD and workspace CAS, atomic history/comment mapping, durable comment outbox,
HTTP-polling collaborative editor and a running self-hosted OpenAI-compatible
AI provider. The host ledger records precise proof and remaining boundaries at
`DisNote-Backend/docs/document-library-integration-acceptance-2026-10-15.md`.
These facts supersede earlier statements that no live model or Mongo adapter was
verified; they do not turn all partial rows into full production/native parity.

Fresh SDK `npm run verify` passes: 154 tests pass, 8 Mongo tests skip, no failures;
strict lint/typecheck, package/examples/Storybook builds pass. Browser suite:
29 pass, 1 viewport-only skip. Production audit: zero advisories. The new browser
collaboration seed subpath brings the export count to 35, all target files exist.
Both hosts use archive SHA-256
`723777e95012c73a8291139b0a22948675a78fc2f3bcc5c6563c62b4ff00ed7a`.
Host FE tests additionally prove pinned database edit revisions preserve a draft
after another writer changes a row and the query refreshes. The editor also
accepts an initially empty page without passing invalid empty initial content
to BlockNote. Logs: `.integration-verify.log`, `.integration-e2e.log`.
