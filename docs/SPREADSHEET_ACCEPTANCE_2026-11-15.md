# Spreadsheet acceptance ledger - 2026-11-15

| ID | Requirement | Boundary | Status/evidence |
|---|---|---|---|
| SHEET-01 | Spreadsheet is independent from Document | Package architecture | Proven: `@disnote/sheets` has no dependency on `@disnote/core`, React or BlockNote |
| SHEET-02 | Versioned sparse workbook model and validation | Core model | Proven by immutable mutation/address/invariant tests |
| SHEET-03 | Safe formulas with ranges and cross-sheet references | Formula engine | Proven for supported operator/function subset, lazy IF and cycle/error handling |
| SHEET-04 | Extensible custom spreadsheet behavior | Plugin boundary | Proven by custom formula function and collision tests |
| SHEET-05 | CSV import/export | Interchange | Proven for quoted, multiline, Unicode, numeric and boolean values |
| SHEET-06 | DisNote XLSX exact round-trip | OOXML | Proven by checksummed canonical snapshot test |
| SHEET-07 | Edited/external XLSX semantic import | OOXML | Proven for stale snapshot rejection and value/formula fallback; full Excel fidelity remains partial |
| SHEET-08 | Safe archive boundary | Security | Proven for malformed/traversal rejection; archive, entry and XML limits are configured |
| SHEET-09 | Optimistic and idempotent persistence | Storage | Proven by in-memory CAS contract test |
| SHEET-10 | MongoDB/PostgreSQL integration without driver lock-in | Adapters | Structural adapter tests proven; live database services remain blocked/unverified |
| SHEET-11 | Independently publishable package | Packaging | Proven by build and dry-run of `@disnote/sheets@0.1.0`: 55 files with JavaScript and declaration entry points |
| SHEET-12 | Grid UI, collaboration and advanced Excel objects | Product/runtime | Not implemented in this foundation; requires separate adapter/runtime acceptance |

No claim is made for complete Microsoft Excel or Google Sheets parity. Charts,
pivots, macros, conditional formatting, images, comments, protected files,
realtime CRDT collaboration and a production grid UI remain explicit backlog.

## Verification receipt

- Focused spreadsheet gate: typecheck, ESLint, build and 12/12 tests pass.
- Full `npm run verify`: exit code 0, including library, Vite, Next.js and
  Storybook production builds.
- Package dry-run: `@disnote/sheets@0.1.0`, 55 files, JavaScript and declaration
  entry points plus formula, import/export and persistence subpaths.
- Combined repository tests: 212 total, 203 passed, 9 explicit environment
  skips, 0 failed.
- Graphify: 335 code files, 2,719 nodes and 7,300 raw edges; zero
  missing/dangling/external endpoints and zero exact duplicate edges.
- Live MongoDB/PostgreSQL, Microsoft Excel/LibreOffice/Google Sheets runtime and
  production grid UI remain outside this receipt.
- npm registry DNS returned `ENOTFOUND` during workspace refresh. The lockfile
  workspace entry reuses the already locked `fflate` dependency and parses
  successfully, but a registry-backed `npm install` should be rerun when network
  access returns to materialize the workspace symlink normally.
