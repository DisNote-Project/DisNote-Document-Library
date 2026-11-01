# Database drag feedback — 2026-10-17

Source: user's Kanban screenshot and request to improve the drag experience.
Implementation lives in the library's optional `@disnote/core/database/styles.css`
and `src/database/react/useDatabaseDragFeedback.ts`, composed by `DatabaseView`.
The Demo consumes the packaged library; no Demo-only styling is required.

| ID | Acceptance | Current evidence |
|---|---|---|
| DRAG-01 | Compact labeled drag preview and faded source, themed consistently | Browser verifies label, themed preview border and source opacity; active target screenshot inspected (native OS drag image itself is outside screenshots) |
| DRAG-02 | Highlight Kanban/calendar destination and table before/after insertion marker | Real pointer verifies Kanban feedback; dispatched drag events verify both row edges and calendar target |
| DRAG-03 | Escape, drag end and outside drop clear transient feedback and preview | Browser proves Escape keeps revision unchanged, removes preview and clears feedback; completed drops/drag-end also clean up. Outside-drop listener shares cleanup; external-window behavior untested |
| DRAG-04 | Drop preserves existing revision/permission checks and persists after reload | Actual Mongo pointer drop/reload passes, as do existing Kanban/calendar/timeline and row-order regressions; no API/domain/schema changes |
| DRAG-05 | Custom CSS tokens and reduced-motion support; mobile editing alternatives retained | Browser proves custom accent reaches preview, reduced motion resolves to zero duration, and mobile edit/keyboard alternatives still persist |

Customize tokens on a `.disnote-db` instance: `--disnote-drag-accent`,
`--disnote-drag-surface`, `--disnote-drag-shadow`, `--disnote-drag-duration`.
Stable styling hooks are `data-dragging`, `data-drop-active`, `data-drop-edge`
(`before`/`after`), `.disnote-db__drag-preview-card` and `.disnote-db__drag-grip`.
The native drag preview copies the source theme tokens. Reduced-motion users get
instant feedback without entry animation. Native drag retains mouse behavior;
mobile editing and keyboard row/date controls remain available.

The hook only manages ephemeral presentation. Drop mutations continue through the
existing injected provider, revision CAS and server row policy. No new persistence,
API, event or permission contract is introduced. A native OS drag image is not
captured by browser screenshots; active source/target feedback can be captured.

Fresh verification: SDK build/lint and 182 unit passes/8 optional Mongo skips;
Demo package install/build and 2 real-Mongo tests pass. All 18 database workbench
regressions pass on desktop/mobile; final focused run on the final archive passes
5 browser cases with 1 deliberate mobile native-drag skip. The initial visual test
attempt failed because element screenshot scrolling interfered with a native drag;
the corrected test scrolls before dragging and captures the viewport, then passes.
Evidence: Demo `e2e/database-drag.spec.ts`, `e2e/database-workbench.spec.ts`,
`test-results/database-drag-database-dra-00e30-cleanly-and-persists-a-drop-desktop/kanban-drag-active.png`.
No new push/npm publication or product FE/backend archive refresh is claimed.
