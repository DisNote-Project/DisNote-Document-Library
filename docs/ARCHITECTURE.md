# Architecture

DisNote owns the durable parts; BlockNote is the first editing adapter, not the
system's final limit.

```
Consumer app
  └─ @disnote/core
       ├─ /editor/react ─────────► BlockNote / ProseMirror
       ├─ /renderer/react ───────► React
       ├─ /renderer/html
       ├─ /renderer/native ──────► React
       ├─ /collaboration ────────► Yjs
       └─ /storage
```

## Layer responsibilities

| Layer | Owns | Does NOT own |
|---|---|---|
| Core | model, validation, migration, traversal, serialization | UI, database, browser input |
| Block registry | block contract + capabilities | global app state |
| Editor adapter | editor ⇄ core conversion | persistence |
| Editor UI | toolbar, menu, drag handle | business permissions |
| Renderer | display a document | editing a document |
| Storage contracts | repository interface | concrete Mongo queries |

## Data flow — edit

```
API document → validate → migrate → DisNoteDocument
  → toEditor → edit → fromEditor → validate → save draft (expected revision)
```

## Data flow — render

```
Published document → validate → migrate → resolve block definitions
  → React / HTML / native renderer
```

## Rules

- The root `@disnote/core` entry imports no React, DOM, database, or BlockNote.
- The persisted format is a `DisNoteDocument`, never a vendor type.
- Everything is versioned: library (SemVer), document (`schemaVersion`), block (`version`).
- Validate at every boundary; trust typed documents internally.
- Transformations are immutable and never mutate their input.
- Unknown blocks are preserved, never silently converted to paragraphs.
