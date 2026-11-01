# Document Library quality audit — 2026-10-18

> Remediation 2026-10-19: the concrete automation/mobile/comment/test and archive
> consistency findings below have been repaired. Current evidence is in
> [QUALITY_FIXES_2026-10-19.md](QUALITY_FIXES_2026-10-19.md). Original failure
> receipts are retained here; the feature backlog remains a separate open scope.

Scope: current local SDK, reference examples and Mongo-backed Document Demo.
This is a verification audit, not a release or a full product implementation.
Existing source changes were preserved. No application code was changed, committed,
pushed or published during this audit. FE/backend builds and production were not
rerun; their historical results are not fresh evidence for this report.

## Verdict

Not complete and not ready for an unconditional stability/release claim. The SDK
passes its static/unit/build gate, but browser checks expose remaining problems.
The implementation queue still explicitly leaves NEXT-08 through NEXT-12 open.

## Acceptance ledger and fresh evidence

| ID | Boundary / acceptance | Result |
|---|---|---|
| QA-01 | SDK typecheck, lint, unit tests, build, examples, Next.js, Storybook | Proven for this checkout: `npm run verify` exit 0; 182 passed, 8 optional Mongo tests skipped, 0 failed. Build emits third-party directive/chunk-size warnings. |
| QA-02 | SDK browser behavior on desktop and Pixel Chromium | Partial: full run 26 passed, 3 failed, 1 intentional desktop skip. Failures: shared-source text insertion on desktop; mobile database delete and history restore pointer interception. See focused recheck below. |
| QA-03 | Mongo Demo build and actual persistence/CAS tests | Proven locally: build exit 0; `DISNOTE_DEMO_TEST_MONGO=true npm test` 2 passed, 0 skipped. Does not replace the SDK's 8 optional integration tests. |
| QA-04 | Demo database/workbench/drag browser paths | Partial: 18 passed, 1 failed, 1 intentional mobile native-drag skip. Mobile record comment was absent after reload in the full run; the same scenario passed in an isolated recheck. Flakiness remains unresolved; durable comment loss is not established. |
| QA-05 | Automation UI tolerates slow successful provider reads | Failed; reproduced against the built Demo with a fresh isolated database. Delay each automation GET response 4 seconds: 4 requests started, 3 responses delivered, 0 automation forms, status remains `Đang tải…`. |
| QA-06 | Consumer package surface and production dependency advisory scan | Pack dry-run exit 0: core 0.7.0, 795 entries, 357106 bytes. Static export-target existence check: no missing paths for core/react. `npm audit --omit=dev` reports 0 vulnerabilities. This is not a clean-consumer install or security certification. |
| QA-07 | Source/host/release consistency | Partial: 36 tracked files modified plus many untracked feature files; local HEAD `7ba4fa6`. Demo archive differs from FE/backend archive (hashes below). No npm registry/publication verification was performed. |
| QA-08 | Complete product scope and deployed/native evidence | Partial: queue NEXT-08..12 remains open; native OS/browser, external webhook recipient, live notification dispatch and production identity/revocation/load evidence are not supplied by these local tests. |

## Findings, in priority order

1. **P2: slow automation reads can starve the panel indefinitely.**
   `packages/disnote/src/database/react/useDatabaseAutomations.ts:9` increments a
   generation on every read and discards older responses. The interval at line 19
   starts a new read every 3000 ms regardless of any request in flight. Consistent
   4000 ms latency makes every successful response obsolete before it arrives.
   Users cannot open/edit rules under that condition. Serialize background reads
   or schedule the next poll after completion, while retaining database-change
   and unmount protection; add an actual delayed-provider regression.
2. **P2: mobile interaction is not verified stable in the SDK reference page.**
   The delete action and revision restore action time out because other table
   cells or neighboring sections intercept pointer events. Failure traces and
   screenshots are retained. This establishes a reference-integration problem;
   it does not establish that every production/mobile host has the same layout.
3. **P2: browser suite has unresolved nondeterminism.** Desktop shared-source
   editing produced `Share changedd seed` rather than the expected append, but
   passed in the focused rerun. Demo record-comment reload failed once then
   passed in isolation. Investigate caret/focus readiness and persistence/read
   timing independently; neither a single retry nor unit success closes these.
4. **Release integration gap:** improved drag feedback is in the Demo archive
   but not in FE/backend vendored archives. Feature changes also remain outside
   the library's last commit. Prepare a coherent version, synchronize consumers,
   run their gates and complete the release workflow before recommending an npm
   upgrade as delivering all current local behavior.

Archive SHA-256 verified during this audit:

- Demo: `A2EFAAD74D3B8B710F8612A5E399BF6F2A622D129B6C02223DAEEF6722BA5B4B`
- FE and backend: `8ED2519E8027EC9071251BD590949493C1ACE2F7C8309F8336D6478FB3E092FE`

## Remaining product scope

`NOTION_COMPLETION_QUEUE.md` is the current implementation map. NEXT-08 covers
guest/group sharing, public links/access requests and anonymous forms; NEXT-09
managed offline pages/app shell/native QA; NEXT-10 indexed search, sourced Q&A
and connectors; NEXT-11 document assets, persisted workspace interchange and
verified PDF output; NEXT-12 large-data/server-query behavior, retention, load,
accessibility and deployment/revocation QA. Some underlying SDK contracts already
exist; end-to-end completion cannot be inferred from those contracts.

## Focused recheck

SDK: 4 passed, 2 failed. Desktop database/shared-source/history and mobile
shared-source passed. Mobile delete and history restore failed again with pointer
interception. These two failures are reproducible in the reference integration.
Demo: mobile chart/form/record/comment/history scenario passed 1/1 in isolation;
the initial full-run failure remains recorded and unresolved.

## Local verification receipts

SDK root: `.audit-2026-10-18-verify.log`, `.audit-2026-10-18-e2e.log`,
`.audit-2026-10-18-e2e-recheck.log`, `.audit-2026-10-18-dependencies.json`,
`.audit-2026-10-18-pack.json`; initial failures under `test-results/`, focused
recheck under `audit-retest-results/`.

Demo root: `.audit-2026-10-18-build.log`, `.audit-2026-10-18-test.log`,
`.audit-2026-10-18-e2e.log`, `.audit-2026-10-18-e2e-recheck.log`,
`.audit-2026-10-18-automation-repro.log`. Diagnostic fixtures use generated IDs;
cleanup is limited to those IDs. No real user documents were edited.
