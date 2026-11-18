# DOCX conversion acceptance ledger - 2026-11-15

| ID | Requirement | Boundary | Status/evidence |
|---|---|---|---|
| DOCX-01 | DOCX ↔ DisNote canonical round-trip | Core/import/export | Proven by Unicode/custom-block exact canonical test |
| DOCX-02 | Edited Word rejects stale embedded state | Integrity/import | Proven by modified `document.xml` fallback test |
| DOCX-03 | External Word semantic import | WordprocessingML | Proven for headings, marks, lists, checklist and tables |
| DOCX-04 | Markdown ↔ DOCX convenience conversion | Public API | Proven for heading, GFM table and callout pipeline |
| DOCX-05 | Future blocks extend conversion safely | Extension boundary | Proven by codec recovery after Word edit |
| DOCX-06 | Malformed/traversal/oversized packages fail closed | Security | Malformed and traversal tests proven; constants bound entries/expanded/XML/block sizes |
| DOCX-07 | Public package exposes converter | Packaging | Proven by `npm pack --workspace @disnote/core --dry-run --ignore-scripts --json`: 28 DOCX artifacts, including `index.js` and `index.d.ts` |
| DOCX-08 | Actual Word/LibreOffice visual compatibility corpus | External runtime | Blocked until runtime/corpus is available |
| DOCX-09 | Images, comments, tracked changes, footnotes and complex drawings | Full Word fidelity | Partial; exact snapshot preserves DisNote source, semantic external mapping remains backlog |
| DOCX-10 | Architecture/maintenance documentation and graph | Documentation | Proven: current combined graph contains 2,719 nodes, 7,300 edges, zero dangling/missing/external edges; architecture, ADR and maintenance guides are present |

No statement of universal DOCX fidelity is made. `DOCX-08/09` remain explicit
compatibility boundaries.

## Fresh gate receipt

- `npm run verify`: exit code 0.
- TypeScript build, ESLint, library build, Vite demo, Next.js demo and Storybook
  production build all passed.
- Current combined test runner: 212 tests, 203 passed, 9 explicitly skipped,
  0 failed.
  Eight skips require `DISNOTE_TEST_MONGO_URI`; one skip records that this
  execution sandbox denies loopback WebSocket connections.
- Package dry-run: `@disnote/core@0.7.0`, 847 files, 28 DOCX artifacts.
- `git diff --check`: no whitespace errors.

Playwright E2E is tracked separately because it requires the same localhost web
server boundary. The runner could not start its localhost server in this sandbox
and was stopped after no Node process or listening port remained. This is recorded
as blocked, not inferred as a pass from the build/unit gate.
