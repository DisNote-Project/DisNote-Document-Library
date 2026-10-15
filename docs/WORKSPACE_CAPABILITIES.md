# Workspace document capabilities

Các module dưới đây bổ sung hành vi thực vào format `DisNoteDocument`. Chúng là
API của thư viện và các React control có thể nhúng vào ứng dụng. Identity, quyền
truy cập, kết nối backend và AI provider do ứng dụng cung cấp qua dependency injection.

## Public imports

| Import | Chức năng |
|---|---|
| `@disnote/core/database` | Property có kiểu, CRUD, query, relation, rollup, formula AST, validation |
| `@disnote/core/database/react` | Provider và table/board/list/gallery/calendar/timeline/map |
| `@disnote/core/workspace` | Cây trang, move, backlinks, trash/restore, shared sources, unsync, template clone |
| `@disnote/core/workspace/react` | Page navigator, breadcrumb, provider cho editor shared blocks |
| `@disnote/core/actions` | Button nhiều bước, commit atomic, idempotency và domain policy |
| `@disnote/core/actions/react` | `ActionProvider`, `ActionButton` |
| `@disnote/core/comments` | Thread service, policy, CAS, outbox event, remap text anchors |
| `@disnote/core/comments/react` | UI bình luận, trả lời, resolve/reopen |
| `@disnote/core/storage` | Revision repository qua CAS adapter, history comparison/restore |
| `@disnote/core/storage/browser` | IndexedDB document state với unique slug/locale index |
| `@disnote/core/storage/react` | History panel và preview phiên bản |
| `@disnote/core/persistence/browser` | IndexedDB CAS adapter cho database/workspace/comments/assets |
| `@disnote/core/offline` | Queue durable, retry, conflict resolution, cache Blob assets |
| `@disnote/core/editor/react` | `OfflineEditor`, Yjs configuration, mentions và mobile bootstrap |
| `@disnote/core/collaboration/browser` | Yjs provider, awareness, BroadcastChannel và reconnecting WebSocket |
| `@disnote/core/search-ai` | Search index/query có quyền và AI preview/confirm pipeline |
| `@disnote/core/search-ai/react` | Search panel và AI preview/apply panel |
| `@disnote/core/import-export` | Bundle/ZIP, Notion API blocks, Notion Markdown/CSV/HTML ZIP |
| `@disnote/core/import-export/react` | Browser print/save-as-PDF control |
| `@disnote/core/mobile` | Native WebView adapter và validated message protocol |
| `@disnote/core/ui` | Catalog vi/en cho các control bổ sung |

## Database

```ts
import { DatabaseService } from "@disnote/core/database";

// Instantiate in the application's DI/composition root.
const databases = new DatabaseService(databaseRepository, databasePolicy);
await databases.create(actorId, {
  id: databaseId,
  title,
  properties: [
    { id: "hours", name: hoursLabel, type: "number" },
    { id: "cost", name: costLabel, type: "formula", formula: {
      kind: "operation", operator: "multiply",
      args: [{ kind: "property", propertyId: "hours" }, { kind: "literal", value: 10 }],
    } },
  ],
  records: [],
});
const page = await databases.query(actorId, databaseId, {
  sort: [{ propertyId: "cost", direction: "desc" }], limit: 25,
});
```

`DatabasePolicy.assert` separates read/write/manage. `canReadRecord` controls
projection; `canWriteRecord` receives before/after values, including deletions.
Mutation results contain only ID/revision. Relations and rollups exclude hidden
record IDs/values. Formula evaluation interprets a bounded AST, never JavaScript.
Formula operators currently cover arithmetic, concatenation, comparison, Boolean
operations and conditional expressions; this is not Notion's full formula syntax.

Bind `DatabaseViewProvider` to authorized endpoints and put `DatabaseProvider`
around both `DisNoteEditor` and `DocumentRenderer`. The slash-created database
block lets the user bind its database ID. Application property names/options are
document data, so they retain their author-provided language.

Calendar renders a month grid, timeline uses date ranges, and the default map
projects numeric latitude/longitude onto a coordinate grid. It does not include
third-party street tiles. Views display the current query page; the reference
query engine operates on bounded snapshots, not a production search/database index.

## Pages and shared content

`WorkspaceDocumentService.execute` validates all actions before an atomic CAS
commit. It rejects parent cycles, enforces permission on affected descendants,
and preserves content during trash/restore. `backlinks` and `breadcrumbs` filter
read access. `resolveDocument` expands shared sources with authorization and cycle
limits; projected IDs are namespaced to avoid duplicate DOM anchors.

Use `WorkspaceProvider` to supply pages, sources and committed-change subscription
to the editor. Shared-source editing opens an isolated, focus-managed dialog;
its save uses the source revision captured when editing began. `unsyncBlock`
copies independent blocks with regenerated IDs. `instantiateTemplate` regenerates
document/nested block IDs while retaining references to external entities.

Call `resolveDocument` before published rendering. Supply `breadcrumbs` to
`DocumentRenderer` or HTML rendering policy; supply permission-filtered database
query results through `HtmlRenderPolicy.databaseViews` for static export.

## Buttons and transactions

`actionButtonBlock(actionId, localizedLabel)` creates a button bound through
`ActionProvider`. `DocumentButtonActionService` supports workspace actions plus
database record insert/update/delete. Domain factories inject the existing
workspace/database services against private draft repositories. A single outer
CAS commits pages, databases and an actor-scoped receipt together. A failing final
step leaves earlier changes uncommitted. Reusing a key with a different plan fails.

The transaction adapter owns the composite `ButtonActionState`. Do not implement
its final write as independent writes to multiple collections. Providers must
retain a stable action plan for a retry key, including generated IDs/timestamps.
Persisted receipts need an application retention policy.

## Comments, history and offline

`CommentService` writes thread changes and notification events in the same
snapshot. The application dispatcher must deliver/deduplicate those outbox events
and authorize notification recipients. `remapCommentAnchors` accepts exact UTF-16
text edits; the host must feed editor/CRDT edit mappings. It is not an automatic
replacement for collaborative relative-position anchors.

`RevisionDocumentRepository` works over `DocumentStateRepository`. The adapter
must atomically enforce revision CAS and unique slug/locale. The browser adapter
implements both. Restoring a historical revision creates a new draft revision;
existing published pointers and historical content stay immutable.

`OfflineDocumentController` retains pending changes on network failure/conflict.
Writes use stable idempotency keys; a conflict requires explicit merged/replacement
content. `OfflineEditor` queues changes and retries when transport returns. Select
an account/workspace-specific IndexedDB namespace and clear it at logout.

`OfflineAssetCache` uses an injected authorized loader and durable Blob store.
Prepare asset IDs before going offline; release object URLs when switching documents
and clear stored Blobs at logout. To use prepared browser Blob URLs, provide an
asset resolver and explicitly allow `blob:` in the renderer URL policy. The cache
does not download arbitrary URLs found in document text or provide a service worker
for offline application-shell navigation.

## Collaboration

```tsx
<DisNoteEditor
  initialDocument={documentEnvelope}
  collaboration={{
    fragment: provider.fragment,
    provider,
    user: currentCollaborator,
  }}
/>
```

Keep fragment/provider identity stable for the editor mount. Collaboration uses
a `Y.XmlFragment`; the existing JSON snapshot binding uses separate Y.Array/Y.Map
structures. They must not be treated as the same representation. The authoritative
session must initialize content once; each joining client must not seed an empty
room with its own copy of `initialDocument.blocks`.

`BroadcastChannelCollaborationTransport` is a same-origin reference for tabs.
`WebSocketCollaborationTransport` renews its authenticated URL on reconnect and
replays local state so interrupted sends can converge. The server example stores
binary document updates and relays ephemeral presence separately. Production must
issue document-scoped credentials from trusted identity and enforce current access
and revocation policy. Destroy providers/transports when leaving a document.

## Search and AI

`DocumentSearchService` filters permissions before ranking/snippets/counts and
rejects stale index projections. The reference index is in memory; production
should provide its own indexed candidate repository.

`DocumentAIService` checks every context document before invoking the provider,
validates operations/output against the block registry, and compares the current
checksum on confirmation. The host must CAS-commit the confirmed document too.
No model credentials or cloud provider are embedded in the library. Provider and
network execution remain application/server responsibilities.

## Import/export and mobile

Canonical JSON/ZIP bundles retain documents, page hierarchy, assets, database
snapshots and shared sources. ZIP parsing caps compressed/expanded size and entry
count and rejects traversal paths. Bundle export is a content interchange format;
it does not currently archive comments, revision histories or notification receipts.

Notion API import accepts expanded child lists; incomplete children and unsupported
blocks/marks produce warnings. Notion ZIP import restores basic page hierarchy,
relative page references, standalone Markdown image assets and CSV data. CSV
property types, formulas, relations, rollups and saved views cannot be reconstructed
from values alone; the importer reports that loss instead of claiming lossless parity.

`PrintDocument` renders a printable isolated frame and invokes the system dialog
for PDF output. It is not a headless server PDF engine.

Inject the host's `react-native-webview` component into `NativeDocumentEditor`
and point it at a trusted HTTPS page mounting `MobileEditorBridge`. Messages validate
format/version, document ID, document shape and editable state. The web bootstrap
rejects foreign-origin initialization. The browser protocol can be tested locally;
Android/iOS keyboard, selection and platform file/offline adapters require native QA.

## Reference demo and acceptance

Run `npm run build` followed by
`npm run dev --workspace @disnote/react-demo -- --host 127.0.0.1 --port 4173`.
Open `/parity` for database/comments/offline/collaboration/pages/shared-source/history
and `/mobile-editor` for the WebView bootstrap. Demo allow-all policies and the
transport-availability switch are fixtures, not production integrations.

Fresh receipts and remaining boundaries are recorded in
[`NOTION_PARITY_ACCEPTANCE.md`](NOTION_PARITY_ACCEPTANCE.md).

## DisNote product integration — 2026-10-15

The adjacent `DisNote-Backend` and `fe` repositories now inject real Mongo-backed
database/workspace/history/comment/search/AI and authenticated HTTP-polling Yjs
adapters. Their acceptance ledger is
`DisNote-Backend/docs/document-library-integration-acceptance-2026-10-15.md`.
Library reference adapters remain independently usable.

Browser-only `@disnote/core/editor/react/collaboration` exports
`createEditorCollaborationSeed(document)`. Generate a candidate binary seed,
atomically choose one server-side, and apply the accepted winner before mounting
the collaborative editor. Independently inserting the same initial blocks into
each participant's Y.Doc duplicates content. Canonical projection also needs a
server revision/generation fence; the product enforces that in its workspace CAS.

The package exports ESM defaults for modern Node require(ESM) hosts and includes
subpath declarations for older TypeScript module resolution. Both product hosts
pin the same vendored archive. A cross-realm JSON test covers VM/iframe native
plain-object inputs without admitting class instances or exotic objects.
