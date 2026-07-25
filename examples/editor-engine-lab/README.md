# editor-engine-lab

Educational only. A ~150-line block editor engine that shows what a real engine
does: state, a caret selection, transactions (`insertText`, `splitBlock`,
`mergeBackward`, `setType`), a transaction log, and undo/redo.

It is deliberately naive. Production editing uses BlockNote → ProseMirror
through `@disnote/editor-blocknote`. This lab is **not** imported by any
production package. Run its test with the root `npm test`.
