# Features and Usage

This is the practical consumer guide for DisNote Document Library. The library
owns a vendor-neutral JSON document contract; editors, renderers, storage,
collaboration and product services plug into that contract.

## 1. Package selection

| Need | Install/use |
|---|---|
| Model, builders, validation, migrations | `@disnote/core` |
| Static SSR HTML | `@disnote/core/renderer/html` |
| Read-only React UI | `@disnote/core/renderer/react` |
| Read-only React Native UI | `@disnote/core/renderer/native` |
| BlockNote conversion only | `@disnote/core/editor` |
| React editor facade | `@disnote/core/editor/react` |
| Revision and publishing contracts | `@disnote/core/storage` |
| Markdown/HTML interchange | `@disnote/core/import-export` |
| Upload validation | `@disnote/core/assets` |
| Comment threads and mentions | `@disnote/core/comments` |
| Search projection and AI operations | `@disnote/core/search-ai` |
| Legal/article application use cases | `@disnote/core/legal` |
| Yjs snapshots and update persistence | `@disnote/core/collaboration` |
| Reusable fixtures and repository tests | `@disnote/core/testing` |

Packages are ESM and require Node.js 20.19 or newer for the repository toolchain.
React packages accept React 18.3 or React 19.

## 2. Create a document

```ts
import {
  createDocument,
  heading,
  paragraph,
  callout,
  text,
} from "@disnote/core";

const document = createDocument({
  id: "doc_launch",
  metadata: {
    title: "Launch plan",
    locale: "en",
  },
  blocks: [
    heading(1, [text("Launch plan")]),
    paragraph([text("One contract shared by every surface.")]),
    callout([text("Review before publishing.")], "warning"),
  ],
});
```

Never use an array index as a block ID. Builders generate stable IDs and valid
V1 block shapes.

## 3. Validate untrusted data

Validate values returned by HTTP, databases, imports, editor adapters and
collaboration snapshots:

```ts
import {
  articleRegistry,
  validateDocument,
} from "@disnote/core";

const result = validateDocument(JSON.parse(requestBody), {
  registry: articleRegistry,
  strictUnknownBlocks: true,
  maxDepth: 8,
});

if (!result.ok) {
  console.error(result.issues);
  throw new Error("Invalid document");
}

const trustedDocument = result.value;
```

TypeScript casts do not validate runtime JSON. Keep the input typed as `unknown`
until validation succeeds.

## 4. Traverse and transform

```ts
import {
  findBlock,
  updateBlock,
  visitBlocks,
} from "@disnote/core";

visitBlocks(document, ({ block, depth }) => {
  console.log(depth, block.type, block.id);
});

const block = findBlock(document, "blk_target");
const result = updateBlock(document, "blk_target", {
  props: { intent: "info" },
});

if (result.ok) {
  // result.document is new; document remains unchanged.
  console.log(result.changedBlockIds);
}
```

Other transformations include insert, append, replace, remove, move, wrap and
map. Handle typed errors instead of assuming a block exists.

## 5. Migrate persisted documents

```ts
import {
  createMigrationRegistry,
  validateDocument,
} from "@disnote/core";

const migrations = createMigrationRegistry()
  .registerDocumentMigration(0, 1, migrateV0ToV1)
  .registerBlockMigration("callout", 1, 2, migrateCallout);

const migrated = migrations.migrate(persistedDocument);
if (!migrated.ok) throw new Error(migrated.error.message);

const validated = validateDocument(migrated.document);
if (!validated.ok) throw new Error("Migrated document is invalid");
```

Commit old JSON fixtures with every migration. A persisted breaking change is
not complete until its migration and regression test exist.

## 6. Render safe static HTML

```ts
import { articleRegistry } from "@disnote/core";
import { renderDocumentToHtml } from "@disnote/core/renderer/html";

const result = renderDocumentToHtml({
  document,
  registry: articleRegistry,
  policy: {
    link: { allowHttp: false },
    resolveAssetUrl: (assetId) => cdn.getUrl(assetId),
  },
});

console.log(result.html);
console.log(result.headings, result.assets, result.warnings);
```

Text and attributes are escaped. Unsafe links are rendered as inert text and
reported in `warnings`. The HTML renderer is suitable for SSR, email and static
export without loading an editor.

## 7. Render in React

```tsx
import { articleRegistry } from "@disnote/core";
import { DocumentRenderer } from "@disnote/core/renderer/react";

export function Article({ document }: { document: DisNoteDocument }) {
  return (
    <DocumentRenderer
      document={document}
      registry={articleRegistry}
      referenceResolver={(type, id, label) => ({
        status: "resolved",
        href: `/${type}/${id}`,
        label,
      })}
      assetResolver={(assetId) => `/api/assets/${assetId}`}
    />
  );
}
```

Use `blockRenderers` to render consumer block types without editing core.
Do not use the editor in read-only mode as a public renderer.

## 8. Render in React Native

`DocumentNativeRenderer` receives platform primitives so the package does not
force a UI kit:

```tsx
<DocumentNativeRenderer
  document={document}
  primitives={{
    View,
    Text,
    Image: NativeImage,
  }}
  assetResolver={(assetId) => assetUrls[assetId]}
/>
```

Fonts and design tokens belong to the application theme, not persisted JSON.

## 9. Use the BlockNote adapter

Use the root export when you only need conversion:

```ts
import { createBlockNoteAdapter } from "@disnote/core/editor";

const adapter = createBlockNoteAdapter();
const editorDocument = adapter.toEditor(document);
const savedDocument = adapter.fromEditor(editorDocument);

const report = adapter.validateRoundTrip(document);
if (!report.ok) console.error(report.differences);
```

The adapter preserves IDs, block versions, props, nested blocks, marks,
mentions and references.

## 10. Use the React editor

Install compatible peers:

```bash
npm install @disnote/core react react-dom \
  @blocknote/core@0.52.1 @blocknote/react@0.52.1 \
  @blocknote/mantine@0.52.1 @blocknote/xl-multi-column@0.52.1
```

```tsx
import { useRef } from "react";
import {
  DisNoteEditor,
  type DisNoteEditorHandle,
} from "@disnote/core/editor/react";

export function Editor({ initialDocument }: Props) {
  const ref = useRef<DisNoteEditorHandle>(null);

  return (
    <DisNoteEditor
      ref={ref}
      initialDocument={initialDocument}
      onDocumentChange={(next) => autosave.schedule(next)}
    />
  );
}
```

The stable handle exposes `focus`, `getDocument`, `insertBlock` and
`setEditable`. `getExperimentalAccess()` is an explicitly unstable escape
hatch to the vendor editor. Toolbar, slash menu, link editor and upload button
are composable UI building blocks; the application wires them to commands and
permissions.

Load the editor with `React.lazy` or a framework dynamic import so public/read
routes do not download the editor vendor bundle.

## 11. Save revisions safely

```ts
import { InMemoryDocumentRepository } from "@disnote/core/storage";

const repository = new InMemoryDocumentRepository({
  registry: articleRegistry,
});

await repository.create({
  slug: "launch-plan",
  locale: "en",
  kind: "ARTICLE",
  title: "Launch plan",
  actor: user.id,
  document,
});

const save = await repository.saveDraft({
  documentId: document.id,
  expectedRevision: 1,
  document,
  idempotencyKey: crypto.randomUUID(),
  actor: user.id,
});

if (!save.ok && save.reason === "revision-conflict") {
  showConflict(save.currentRevision);
}
```

Production adapters must implement the same reader, writer, publisher and
revision contracts and pass `runDocumentRepositoryContract`.

Published content points to an immutable revision. Saving a new draft must not
change what public readers see.

## 12. Import and export

```ts
import {
  importMarkdown,
  exportMarkdownLossy,
  importHtml,
} from "@disnote/core/import-export";

const imported = importMarkdown(markdown);
console.log(imported.document, imported.warnings);

const exported = exportMarkdownLossy(document);
console.log(exported.output, exported.warnings);

const fromClipboard = importHtml(untrustedHtml);
```

Markdown is not able to represent every DisNote block. Always inspect lossy
warnings instead of silently dropping content.

## 13. Validate and upload assets

```ts
import { InMemoryAssetUploader } from "@disnote/core/assets";

const uploader = new InMemoryAssetUploader({
  allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  maxSize: 10_000_000,
});

const asset = await uploader.upload(
  {
    bytes: new Uint8Array(await file.arrayBuffer()),
    mimeType: file.type,
    fileName: file.name,
    size: file.size,
  },
  { documentId: document.id, actor: user.id },
);
```

The uploader compares declared MIME with magic bytes and generates an asset ID
that is not derived from the filename. `InMemoryAssetUploader` is a reference
implementation for tests and local development. A production `AssetUploader`
adapter still needs object storage, malware scanning, authorization, quotas and
a private object-store policy.

## 14. Comments, mentions and references

Comments are stored outside document revisions:

```ts
import { InMemoryCommentStore } from "@disnote/core/comments";

const comments = new InMemoryCommentStore();
const thread = comments.createThread({
  documentId: document.id,
  revisionBase: 4,
  anchor: { type: "block", blockId: "blk_1" },
  author: user.id,
  body: "Please verify this section.",
});

comments.reconcile(document);
```

When an anchored block disappears, the thread becomes orphaned rather than
being deleted. Inject mention/reference providers from the owning application.

## 15. Search and AI operations

```ts
import {
  buildSearchProjection,
  applyOperations,
  previewDiff,
} from "@disnote/core/search-ai";

const projection = buildSearchProjection(document, articleRegistry, 4);

const proposed = applyOperations(document, [
  {
    kind: "update",
    blockId: "blk_summary",
    patch: { content: [text("A clearer summary")] },
  },
]);

if (proposed.ok) {
  showDiff(previewDiff(document, proposed.document));
  // Persist only after the user accepts.
}
```

AI proposes structured operations. It never receives permission to mutate the
persisted object directly. A failed operation aborts the whole batch.

## 16. Legal and public content

`ContentApplicationService` composes repository capabilities with domain rules:

- create/save/publish/archive;
- effective-date requirement for legal policies;
- migration and validation before public reads;
- audit event logging.

NestJS and Next.js integration examples live in:

- `examples/legal-service-nest`;
- `examples/nextjs-demo`.

The Mongo repository uses separate document/revision collections, optimistic
concurrency, idempotency and transactions. Mongo transactions require a replica
set or sharded cluster.

## 17. Realtime collaboration

The package provides Yjs binding, stable snapshot conversion and update
persistence contracts:

```ts
import * as Y from "yjs";
import {
  seedYDoc,
  encodeState,
  snapshotFromYDoc,
  snapshotToRevision,
} from "@disnote/core/collaboration";

const ydoc = new Y.Doc();
seedYDoc(ydoc, document);
const update = encodeState(ydoc);
await updateStore.appendUpdate(document.id, update);

const { blocks: _blocks, ...envelope } = document;
const snapshot = snapshotFromYDoc(ydoc, envelope);
const revision = snapshotToRevision(snapshot, workspaceRegistry);
```

`examples/collaboration-server` adds:

- document-scoped HMAC authentication;
- WebSocket binary update broadcast;
- reconnect synchronization from snapshot + update log;
- MongoDB durable storage;
- Yjs compaction guarded by a distributed lease;
- update size limits;
- health and Prometheus metrics endpoints.

Deploy it behind TLS and replace the reference token issuer with the platform
identity service.

## 18. Test a custom repository

```ts
import { test } from "node:test";
import {
  runDocumentRepositoryContract,
} from "@disnote/core/testing";

runDocumentRepositoryContract(
  test,
  async () => createMongoHarness(),
);
```

The suite checks creation, revision bumping, stale-write conflicts,
idempotency, published immutability and archive behavior.

## 19. Verification commands

```bash
npm run verify
npm run test:e2e
npm audit --omit=dev
```

Mongo integration tests run when `DISNOTE_TEST_MONGO_URI` points to a replica
set:

```bash
DISNOTE_TEST_MONGO_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0" npm test
```

## 20. Production boundaries

Before production:

1. Validate and migrate at every input boundary.
2. Enforce authorization outside generic core.
3. Run repository contracts against the real database.
4. Run browser E2E for IME, clipboard, history and mobile layout.
5. Monitor collaboration update lag, failures and room size.
6. Back up immutable revisions and collaboration snapshots.
7. Use Changesets for every published API/schema change.
8. Add a migration before shipping persisted breaking changes.
