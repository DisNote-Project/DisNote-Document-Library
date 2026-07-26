# DisNote Document

> A vendor-neutral, block-based document framework for the DisNote ecosystem.
> Stable JSON schema, multi-platform renderers, a replaceable editor adapter,
> versioning + migrations, and connected-context references.

Built following `DISNOTE_DOCUMENT_EDITOR_LIBRARY_SUPER_GUIDELINE.md`.

## Why

If landing pages store Markdown, Legal stores paragraph arrays, and the
workspace stores BlockNote JSON, you end up with three incompatible formats.
This library defines **one document contract** (`DisNoteDocument`) that every
use case shares — before those use cases diverge.

- Documents created in the editor render **without** the editor.
- Old documents are **always migrated** to the newest schema.
- Upgrading BlockNote never changes the persisted public data.
- Custom blocks use the core registry plus a renderer registry for each target
  platform, without modifying core.

## Packages

| Package | Purpose | Deps |
|---|---|---|
| [`@disnote/document-core`](packages/document-core) | Model, validation, migration, transformations, serialization | none (pure TS) |
| [`@disnote/renderer-html`](packages/renderer-html) | Safe HTML / SSR renderer | core |
| [`@disnote/renderer-react`](packages/renderer-react) | React renderer | core, React |
| [`@disnote/renderer-native`](packages/renderer-native) | React Native read renderer + platform-neutral projection | core, React |
| [`@disnote/editor-blocknote`](packages/editor-blocknote) | BlockNote adapter + `<DisNoteEditor>` + toolbar/slash/i18n | core, React, BlockNote |
| [`@disnote/storage-contracts`](packages/storage-contracts) | Repository / publisher interfaces + in-memory impl | core |
| [`@disnote/import-export`](packages/import-export) | Markdown / HTML import + export (lossy warnings) | core |
| [`@disnote/assets`](packages/assets) | Upload validation (MIME + magic bytes) + reference uploader | storage-contracts |
| [`@disnote/comments`](packages/comments) | Comment threads, mention/reference providers | core |
| [`@disnote/search-ai`](packages/search-ai) | Search projection + AI operation pipeline | core |
| [`@disnote/legal-content`](packages/legal-content) | Content application/domain layer for Legal Service | core, storage-contracts |
| [`@disnote/collaboration-yjs`](packages/collaboration-yjs) | Update log + compaction + snapshot→revision, Yjs binding | core, Yjs |
| [`@disnote/document-testing`](packages/testing) | Fixtures, factories, assertions, repository contract suite | core, storage-contracts |

Dependency direction is one-way: **everything points at `document-core`; core
points at nothing.** See [`docs/LIBRARY_MECHANISM.md`](docs/LIBRARY_MECHANISM.md)
for a full walkthrough of how each package is coded and how it runs.
Current build guarantees and supported versions are recorded in
[`docs/VERIFICATION.md`](docs/VERIFICATION.md).

## Quick start

For package-by-package features and complete usage examples, read
[`docs/FEATURES_AND_USAGE.md`](docs/FEATURES_AND_USAGE.md).
For a Vietnamese guide including component props and public API reference, read
[`docs/HUONG_DAN_SU_DUNG.md`](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/HUONG_DAN_SU_DUNG.md).

```bash
npm install
npm run typecheck
npm test
npm run build
npm run verify
```

Create and render a document with no editor:

```ts
import {
  createDocument,
  appendBlock,
  paragraph,
  heading,
  text,
} from "@disnote/document-core";
import { renderDocumentToHtml } from "@disnote/renderer-html";
import { articleRegistry } from "@disnote/document-core";

let doc = createDocument({ metadata: { title: "Hello" } });
doc = appendBlock(doc, heading(1, [text("Hello DisNote")])).document;
doc = appendBlock(doc, paragraph([text("Rendered without an editor.")])).document;

const { html, plainText, headings } = renderDocumentToHtml({
  document: doc,
  registry: articleRegistry,
});
```

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/DOCUMENT_FORMAT_V1.md`](docs/DOCUMENT_FORMAT_V1.md). Implementation
roadmap follows the 13 milestones in the super guideline. This repository
implements **Milestones 1–13**: repository foundation, document core, migration
framework, React + HTML/SSR renderers, the BlockNote adapter and editor UI,
storage contracts, Legal Service content layer + landing, import/export, assets,
comments, search + AI, hardening (XSS + performance), OSS tooling, and the
CRDT collaboration core. The verification pipeline builds the editor facade,
Yjs binding, transactional NestJS/Mongo example, React and Next.js demos,
Storybook, and every publishable packag.

## License

Apache-2.0. Editor adapter integrates BlockNote (MPL-2.0). See
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Not legal advice.
