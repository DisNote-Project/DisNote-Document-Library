# @disnote/core

## 0.8.0

### Minor Changes

- 25272da: Add durable database automations with record/schedule triggers, typed conditions and
  actions, owner-scoped configuration, leased workers, atomic DB checkpoints, stable
  webhook idempotency keys, retry/history UI and injected host effects.
- 25272da: Add local Mermaid/draw.io diagram blocks and scoped database presentation styles.
- 25272da: Add atomic database commands, saved view configuration, interactive database workbench,
  authorized chart aggregates/private forms, range rescheduling and record document/history UI.
- 25272da: Add DocumentPage with standard/full width layouts and a typed page-width CSS token.
- 7ba4fa6: Add a lazy React quick-start entry, optional scoped CSS, public design tokens and
  typed per-instance styles. Preserve stable editor/renderer classes when consumers
  add their own classes; map renderer themes to overridable CSS variables.
- 25272da: Expose canonical block/inline comment anchors from editor selection, display the
  current comment scope, and preserve database workbench revisions while writes
  are pending. Record documents require saved content before position-based comments.
- 033ed9b: Add typed database/query/formula/relation services, workspace pages and shared
  sources, atomic button actions, comment/history controls, durable browser adapters,
  offline document/asset support, collaborative editor transports, authorized search
  and AI preview, Notion/ZIP interchange, printable output and a mobile editor bridge.
  Bundle Vietnamese editor messages and localize reader controls. Keep collaboration
  and shared-source editor dependencies behind lazy boundaries. Preserve prototype-like
  keys during canonical serialization.

### Patch Changes

- 25272da: Keep slow automation reads from being superseded by background polls, and prevent closing a record while a comment is still being persisted. Contain database layouts in the reference demo on narrow screens.
- 25272da: Add compact themed database drag previews, source fading, Kanban/calendar drop
  targets and table insertion markers, with cancellation cleanup and reduced motion.

## 0.7.0

### Minor Changes

- Add a Word-like equation composer with reusable structures and symbols, semantic
  MathML rendering, math validation, Markdown/HTML round-tripping, Native fallback,
  and public math palette utilities. Standardize DisNote-owned editor UI on a
  single typed English message catalog with partial application-level overrides.

## 0.6.1

### Patch Changes

- Harden document validation and URL handling, preserve Yjs updates during
  compaction, enforce immutable storage boundaries, correct renderer fallbacks,
  and keep editor-only dependencies optional for core consumers.

## 0.6.0

### Minor Changes

- Add multi-column document blocks and editor layout support.

## 0.5.0

### Minor Changes

- 3a006cf: Expand the document editor with rich clipboard import from rendered Markdown previews, additional document block types, and block-range selection operations.
