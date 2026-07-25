# @disnote/editor-blocknote

The first editing adapter for DisNote Document. Converts between
`DisNoteDocument` and BlockNote and exposes `<DisNoteEditor>` **without leaking
the vendor API** from the stable surface.

Two entry points:

- `@disnote/editor-blocknote` — the pure adapter (`createBlockNoteAdapter`,
  `blockToBn`, `blockFromBn`, round-trip validation). No BlockNote dependency,
  fully unit-testable without a browser.
- `@disnote/editor-blocknote/react` — the `<DisNoteEditor>` React facade.
  Requires the pinned compatible BlockNote peer range and React 18 or 19. It is
  emitted by the normal package build and included in the npm package.

```ts
import { createBlockNoteAdapter } from "@disnote/editor-blocknote";

const adapter = createBlockNoteAdapter();
const report = adapter.validateRoundTrip(document); // { ok, differences }
```

## Round-trip invariant

`DisNoteDocument A → toEditor → fromEditor → DisNoteDocument B` must be
semantic-equivalent: no lost blocks, ids, marks, props, children, or order.
`validateRoundTrip` enforces this and every V1 fixture is covered by tests.

Upgrading BlockNote must never change the persisted `DisNoteDocument`. Run the
round-trip suite on every editor upgrade.

## Schema bridge

Native paragraph, heading and list blocks use BlockNote's built-in editing
behavior. DisNote-only and consumer blocks travel through the `disnoteBlock`
spec with serialized props and version metadata. Mention and reference nodes
have dedicated inline specs. The document envelope keeps metadata for native
blocks that BlockNote does not expose, so it never becomes persisted vendor
data.
