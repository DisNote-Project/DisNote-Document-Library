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

## Package

The library ships as one tree-shakable package, `@disnote/core`. Import only
the subpath needed by the application:

| Import | Purpose | Optional runtime peers |
|---|---|---|
| `@disnote/core` | Model, builders, validation, migrations, transforms | none |
| `@disnote/core/renderer/html` | Safe HTML / SSR | none |
| `@disnote/core/renderer/react` | Read-only React renderer | React |
| `@disnote/core/renderer/native` | React Native projection/renderer | React |
| `@disnote/core/math` | Equation palette and semantic MathML rendering | none |
| `@disnote/core/editor` | Vendor-neutral BlockNote adapter | BlockNote |
| `@disnote/core/editor/react` | `<DisNoteEditor>` UI | React, BlockNote, Mantine |
| `@disnote/core/storage` | Revision/publishing contracts and reference store | none |
| `@disnote/core/import-export` | Markdown/HTML import/export | none |
| `@disnote/core/assets` | Validated asset upload boundary | none |
| `@disnote/core/comments` | Comment threads and mention providers | none |
| `@disnote/core/search-ai` | Search projection and AI operation pipeline | none |
| `@disnote/core/collaboration` | Yjs binding and update persistence | Yjs |

The root import stays independent of React and BlockNote. See
[`docs/LIBRARY_MECHANISM.md`](docs/LIBRARY_MECHANISM.md)
for a full walkthrough of how each package is coded and how it runs.
Current build guarantees and supported versions are recorded in
[`docs/VERIFICATION.md`](docs/VERIFICATION.md).

## Quick start

For package-by-package features and complete usage examples, read
[`docs/FEATURES_AND_USAGE.md`](docs/FEATURES_AND_USAGE.md).
If you are new to React document editors, start with the Vietnamese
[`docs/BAT_DAU_CHO_NGUOI_MOI.md`](docs/BAT_DAU_CHO_NGUOI_MOI.md).
For a practical Vietnamese guide for `@disnote/core`, read
[`docs/HUONG_DAN_SU_DUNG.md`](docs/HUONG_DAN_SU_DUNG.md).
This single guide also contains the component props and public API reference.
For the Word-like equation composer, superscript/subscript controls and math
rendering, read [`docs/MATH_EDITOR.md`](docs/MATH_EDITOR.md).
For the typed English message catalog and application-level overrides, read
[`docs/I18N.md`](docs/I18N.md).

```bash
npm install @disnote/core
```

Repository development:

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

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/DOCUMENT_FORMAT_V1.md`](docs/DOCUMENT_FORMAT_V1.md). Implementation
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
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Not legal advice.
