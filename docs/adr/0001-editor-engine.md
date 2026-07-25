# ADR 0001: Editor engine

- Status: Accepted
- Date: 2026-07-24

## Context

A block editor needs selection, transactions, keyboard semantics, clipboard,
undo/redo, DOM reconciliation and IME handling. These are extremely hard to get
right across browsers and input methods (including Vietnamese IME).

## Decision

Do **not** write a production editing engine from `contenteditable`. Use
BlockNote (→ Tiptap → ProseMirror → contenteditable) behind an adapter. The
adapter converts between `DisNoteDocument` and the editor's document; the
persisted format never becomes a vendor type.

An educational `examples/editor-engine-lab` may implement a minimal engine for
learning, but it is never exported from production packages.

## Consequences

- Upgrading BlockNote must not change persisted public data (guarded by
  round-trip fixtures).
- A custom engine is reconsidered only if ProseMirror cannot satisfy a core
  invariant and the team has editor-engine expertise and a browser/IME test
  matrix.
