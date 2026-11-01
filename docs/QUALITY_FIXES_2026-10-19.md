# Document Library audit repairs — 2026-10-19

Scope: repair the concrete findings in `QUALITY_AUDIT_2026-10-18.md` and
synchronize local SDK consumers. The Notion feature backlog NEXT-08..12 is a
separate scope and remains open. Existing unrelated changes are preserved.

## Acceptance ledger

| ID | Behavior / boundary | Implementation and evidence |
|---|---|---|
| FIX-01 | Slow successful automation reads finish; background polling preserves unsaved rules | `useDatabaseAutomations` tracks the active read; background polls skip it instead of invalidating its generation. Explicit reloads still supersede obsolete reads; unmount/database changes invalidate pending responses. Demo regression delays GET responses 4 seconds, requires two delivered responses, maximum concurrency 1, a visible form and the unchanged draft. |
| FIX-02 | Mobile database delete and history restore remain clickable | Reference ParityLab imports the SDK's opt-in database stylesheet and constrains section widths and long labels. Tables scroll inside their container. Real pointer-based SDK mobile CRUD/delete and history restore pass without forced clicks. |
| FIX-03 | Shared-source editing/persistence test targets the intended paragraph | The test edits the actual paragraph instead of depending on visual `End` placement or the editor's trailing empty block. Both rendered occurrences and reload persistence are checked. Full SDK browser run passes; focused desktop/mobile repetition passes 6/6. |
| FIX-04 | Closing a record does not interrupt a pending comment write | `CommentPanel.onBusyChange` exposes the mutation/readback lifetime; RecordPageDialog disables Close/body save/history restore and ignores Escape until it finishes. Existing revision checks and host policies are unchanged. Demo holds the comment PUT, asserts disabled Close and ignored Escape, releases it, checks a rendered comment article and server GET, then reopens after reload. It no longer mistakes textarea draft text for persistence. |
| FIX-05 | Demo, FE and backend use the same repaired SDK archive | All three vendored core archives have SHA-256 `5347258F8480A70BFAA3773C2CB6E23BD4726F12FFBCF87EA4E2E3624C2A3AD2`. Each consumer was reinstalled; installed automation JS hashes match SDK output. FE/backend lockfile changes only update core archive integrity. |
| FIX-06 | Regression/build gates complete after the interrupted run | SDK full verify exit 0: 182 passed/8 optional integration skips; final lint exit 0. SDK browser 29 passed/1 intentional desktop skip; shared-source repeat 6 passed. Interrupted consumer runs are not accepted as completed evidence; final consumer results are recorded below. |

## Verification receipts

Final consumer gates on 2026-10-19:

- FE: build exit 0; 65 test files / 268 tests passed.
- Backend: build exit 0; 183 suites / 681 tests passed; 2 suites / 6 tests
  intentionally skipped; architecture checked 684 files with no failures.
- Mongo Demo: build exit 0; 2 real-Mongo tests passed, none skipped; full browser
  run 35 passed / 3 intentional skips (2 unconfigured live-AI cases and 1
  mobile native HTML-drag case). Slow-provider and pending-comment regressions
  pass on both desktop and Pixel Chromium.
- Record/comment/history scenario repeated three times per browser profile:
  6/6 passed, including blocked Close/Escape while the PUT is held and server
  persistence/reload checks. Receipt: Demo `.fix-final-comment-repeat.log`.
- SDK: verify and final lint passed; unit 182 passed / 8 optional integration
  skips; browser 29 passed / 1 intentional skip; shared-source repetition 6/6.

FE/backend HEADs at verification are `ecfbe1d` and `6c6355e`; their unrelated
channel changes are retained. This repair only changes their core archive and
lockfile integrity, not host application logic.

SDK: `.fix-audit-verify.log`, `.fix-audit-lint-final.log`,
`.fix-audit-e2e-final.log`, `.fix-audit-shared-repeat.log`.
Consumer final receipts use `.fix-final-build.log`, `.fix-final-tests.log`;
Demo additionally `.fix-final-e2e.log`; backend additionally
`.fix-final-architecture.log`.

The initial repair browser run used Control+End and exposed the trailing empty
block; that failed run is superseded by the explicit-paragraph edit and the
passing full/repeated runs. The original audit remains a historical receipt.
No npm publication, push, deployment or native-device verification is claimed.

Local Demo restored after browser testing at `http://127.0.0.1:4174`;
`GET /api/health` returns HTTP 200.
