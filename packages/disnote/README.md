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
- Old documents can be migrated explicitly before validation/rendering.
- Upgrading BlockNote never changes the persisted public data.
- Custom blocks use the core registry plus a renderer registry for each target
  platform, without modifying core.

## Imports

`@disnote/core` is one tree-shakable package. Import only the subpath needed by
the application:

| Import | Purpose | Optional runtime peers |
|---|---|---|
| `@disnote/core` | Model, builders, validation, migrations, transforms | none |
| `@disnote/core/renderer/html` | Safe HTML / SSR | none |
| `@disnote/core/renderer/react` | Read-only React renderer | React |
| `@disnote/core/renderer/native` | React Native projection/renderer | React |
| `@disnote/core/editor` | Vendor-neutral BlockNote adapter | BlockNote |
| `@disnote/core/editor/react` | `<DisNoteEditor>` UI | React, BlockNote, Mantine |
| `@disnote/core/storage` | Revision/publishing contracts and reference store | none |
| `@disnote/core/import-export` | Markdown/HTML import/export | none |
| `@disnote/core/assets` | Validated asset upload boundary | none |
| `@disnote/core/comments` | Comment threads and mention providers | none |
| `@disnote/core/search-ai` | Search projection and AI operation pipeline | none |
| `@disnote/core/collaboration` | Yjs binding and update persistence | Yjs |

The root import stays independent of React and BlockNote. See the repository
[`LIBRARY_MECHANISM.md`](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/LIBRARY_MECHANISM.md)
for a full walkthrough of how each package is coded and how it runs.
Current build guarantees and supported versions are recorded in
[`VERIFICATION.md`](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/VERIFICATION.md).

## Quick start

For package-by-package features and complete usage examples, read
[`FEATURES_AND_USAGE.md`](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/FEATURES_AND_USAGE.md).
If you are new to React document editors, start with
[`BAT_DAU_CHO_NGUOI_MOI.md`](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/BAT_DAU_CHO_NGUOI_MOI.md).
For a Vietnamese guide including component props and public API reference, read
[`docs/HUONG_DAN_SU_DUNG.md`](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/HUONG_DAN_SU_DUNG.md).

```bash
npm install @disnote/core
```

Create and render a document with no editor:

```ts
import {
  createDocument,
  paragraph,
  heading,
  text,
  articleRegistry,
} from "@disnote/core";
import { renderDocumentToHtml } from "@disnote/core/renderer/html";

const doc = createDocument({
  metadata: { title: "Hello" },
  blocks: [
    heading(1, [text("Hello DisNote")]),
    paragraph([text("Rendered without an editor.")]),
  ],
});

const { html, plainText, headings } = renderDocumentToHtml({
  document: doc,
  registry: articleRegistry,
});
```

## Architecture

See [`ARCHITECTURE.md`](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/ARCHITECTURE.md)
and [`DOCUMENT_FORMAT_V1.md`](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/docs/DOCUMENT_FORMAT_V1.md). Implementation
roadmap follows the 13 milestones in the super guideline. This repository
implements **Milestones 1–13**: repository foundation, document core, migration
framework, React + HTML/SSR renderers, the BlockNote adapter and editor UI,
storage contracts, Legal Service content layer + landing, import/export, assets,
comments, search + AI, hardening (XSS + performance), OSS tooling, and the
CRDT collaboration core. The verification pipeline builds the editor facade,
Yjs binding, transactional NestJS/Mongo example, React and Next.js demos,
Storybook, and the publishable package.

## License

Apache-2.0. Editor adapter integrates BlockNote (MPL-2.0). See
[`THIRD_PARTY_NOTICES.md`](https://github.com/DisNote-Project/DisNote-Document-Library/blob/main/THIRD_PARTY_NOTICES.md).
Not legal advice.
