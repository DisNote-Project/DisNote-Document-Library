# @disnote/renderer-html

## 0.2.0

### Minor Changes

- 3017ef7: Initial V1 foundation: document format, core, migrations, React/HTML renderers,
  BlockNote adapter + editor UI, storage contracts, import/export, assets,
  comments/mentions/references, search + AI operations, Legal Service content
  layer, and the CRDT-agnostic collaboration core.
- a1dc792: Notion-style editing surface.

  - `editor-blocknote`: render through `@blocknote/mantine`'s `BlockNoteView` so the
    slash menu, formatting toolbar, drag-and-drop side menu, link toolbar, keyboard
    shortcuts and placeholders work out of the box (previously `BlockNoteViewRaw`
    had no components context, so all default UI rendered nothing). Adds light/dark
    theme support and a `/`-menu entry for callouts.
  - `editor-blocknote`: map quote, code block, divider and toggle to native BlockNote
    blocks and give callout a first-class styled block spec (icon + intent) instead
    of routing everything through the generic label wrapper. Only round-trippable
    blocks are offered, so strict validation on save still holds.
  - `document-core`: add a `toggle` (collapsible) core block type.
  - `renderer-react` / `renderer-html`: render the new `toggle` block.

  Adds `@blocknote/mantine` as an (optional) peer dependency of `editor-blocknote`.

### Patch Changes

- Updated dependencies [3017ef7]
- Updated dependencies [a1dc792]
  - @disnote/document-core@0.2.0
