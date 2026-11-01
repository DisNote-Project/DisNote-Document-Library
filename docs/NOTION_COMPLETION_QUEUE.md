# Notion comparison implementation ledger — 2026-10-17

Repair checkpoint 2026-10-19: concrete audit defects repaired; current map and
receipts: `QUALITY_FIXES_2026-10-19.md`. SDK browser29pass/1skip and shared-source
repeat6pass; SDK verify182pass/8optional skips. Demo build/2realMongo tests and
browser35pass/3configured skips pass, including delayed automation reads and
pending-comment close/Escape protection. FE build/268tests and backend
build/681tests(6skips)/architecture684 pass. All three host archives share
SHA-256 `5347258F8480A70BFAA3773C2CB6E23BD4726F12FFBCF87EA4E2E3624C2A3AD2`.
NEXT-08..12 are still feature backlog; no release/deployment/full-parity claim.

Audit checkpoint 2026-10-18: `QUALITY_AUDIT_2026-10-18.md` supersedes historical
gate claims for the current checkout. SDK full verify passes (182/8 optional skips),
but full SDK browser run has 3 failures and focused recheck reproduces mobile
delete/history pointer interception. Slow automation reads reproduce an indefinite
loading state. Demo workbench/drag has 18 passes/1 failure/1 skip; its mobile
record-comment reload failure passes in isolation and remains unresolved.
Demo archive includes newer drag feedback than FE/backend archives. NEXT-08..12
remain queued; no complete parity, release or production stability is claimed.

Authorization: implement all gaps from the comparison. Existing source and user
changes are retained. This ledger distinguishes SDK contracts, reference demo,
authenticated DisNote hosts and deployed/native verification.

| ID | Acceptance | Status / evidence |
|---|---|---|
| NEXT-01 | Inline cells, multi-row atomic edits/deletes, reorder/resize columns/rows, Kanban/date drag with keyboard alternatives | SDK + Mongo demo proven: conflict draft preservation, single-revision bulk, row/column keyboard order, width slider, Kanban/calendar drag and timeline keyboard. Authenticated host API/workbench connected; exhaustive accessibility and cross-client load QA pending |
| NEXT-02 | Property editor, filter/sort/group UI, visible columns and named persisted views | SDK + Mongo demo proven: named views, nested filter, width/visibility/order persist; property edits refresh active table. Host workbench/HTTP/mock synchronized; deployed identities and exhaustive composite filters remain unclaimed |
| NEXT-03 | Record opens as editable document with properties/comments/history | SDK/demo + signed-identity host fixture proven: Form→record document/properties/comments/history reopen through Mongo. Host body/history/anchor mapping share one aggregate CAS; property edits use independent DB CAS. Native record view and delivered record-comment notifications pending |
| NEXT-04 | Extended formulas, relation/person pickers, task hierarchy/dependencies and rescheduling | SDK/demo/host fixture proven: 34 deterministic AST operations, structured editor and permission-filtered relation search; task DAG/hierarchy, hidden-reference redaction, atomic dependent reschedule/denied-row rollback and subitem navigation. Product member search uses directory permission plus current DB access, with server assignment recheck. Native/assistive-technology and live directory/revocation QA remain unclaimed |
| NEXT-05 | Chart aggregations and forms saving typed validated records | SDK/demo/host fixture proven: all-authorized-row aggregate, bar/line/donut, typed managed forms and write denial. Saved chart embedding through document editor persists/reloads in host browser. Anonymous/public form policy belongs to NEXT-08 and remains pending |
| NEXT-06 | Trigger/condition/action automation, schedules/webhooks, receipts/retry/history | SDK/host/Demo implemented: durable source enqueue, owned rules, current ACLs, CAS checkpoints/leases, schedules, registered webhook/retry/history. Actual HTTP/Mongo automation browser passes on desktop/mobile; Demo schedule also runs with editor closed. Registry/DNS/signature tests pass; live external receiver/deployment proof pending. Contract: `DATABASE_AUTOMATIONS.md` |
| NEXT-07 | Remote cursor/selection and authoritative comment anchors/notification delivery | SDK/host fixture proven for cursor/selection/offline/departure and selected-text comment persistence/remapping on desktop/mobile. Server binds awareness to actor/client/generation and rechecks access. Record comment outbox, deduplication, row-policy and record-navigation scope pass unit tests. Live notification dispatch/recipient browser, native and deployment evidence remain pending. Contract: `COLLABORATION_AND_COMMENTS.md` |
| NEXT-08 | Guest/person/group sharing, public links and access-request workflow | Queued; trusted identity and deployment evidence required |
| NEXT-09 | Download/manage offline pages, app shell and native adapters/QA | Queued; existing durable queue/blob cache |
| NEXT-10 | Indexed search, permission-aware sourced workspace Q&A and connector ingestion | Queued; existing injected AI/search foundations |
| NEXT-11 | Document-scoped assets, persisted workspace import/export and verified PDF artifact | Queued |
| NEXT-12 | Bounded large-data rendering/server queries, retention, load/a11y/deployment/revocation QA | Queued |

Every row requires applicable UI/API/service/persistence/event and test evidence.
External delivery, deployed identity, native-device and generated-PDF evidence may
not be inferred from a widget, interface, fixture or successful TypeScript build.
No full Notion parity or numerical completion percentage is asserted.

Implementation checkpoint (continuing): `src/database/{commands,service,validation,record-pages}`
and `src/database/react/{DatabaseWorkbench,EditableCell,FilterEditor,PropertySettings,DatabaseChart,DatabaseForm,RecordPageDialog,DatabaseLinkedView}`.
Demo runtime injects the Mongo CAS repository and scoped record/history adapters;
`?database=<id>#workspace` selects a separate database for exact-ID test fixtures.
Latest SDK full verify passes: 172 unit passes/8 optional Mongo skips, strict build,
lint, examples/Next and Storybook. FE build, 41 files/157 passes and scoped lint pass.
Product browser: 8 passes/2 optional AI skips, including actual HTTP/Mongo person
assignment, form/record, embedded named chart and two-editor collaboration.
Demo final combined run: 30 passes/2 optional AI skips plus 2 real-Mongo tests.
Legacy text-cell locators now target labeled editing controls; all DB scenarios
use isolated generated fixture IDs. Earlier failed runs are superseded by the
fresh passing run. Backend final gates/host acceptance map:
`DisNote-Backend/docs/document-database-workbench-acceptance-2026-10-17.md`.
No production identity, native QA, push or npm publication is claimed.

Automation/collaboration continuation: SDK full verify passed 181 tests/8 optional
Mongo skips; the subsequent range-affinity correction passes fresh build/lint and
182 tests/8 skips. All host archives share SHA-256
`8ED2519E8027EC9071251BD590949493C1ACE2F7C8309F8336D6478FB3E092FE`.
Latest FE build/42 files/160 tests pass; backend build/150 suites/534 passes/6
skips and 666-file architecture pass; explicit real-Mongo HTTP test 5/5 passes.
Demo fresh build, 2 Mongo tests and 32 browser passes/2 optional AI skips pass.
Product final browser passes 10 tests/2 optional AI skips, including selected-text
comments/remapping and two authenticated cursors/offline/departure. Details are in
the host automation/collaboration map. Demo restored at loopback 4174/health 200.
Earlier failing browser runs uncovered revision readiness, quote-boundary affinity
and test selection/navigation issues; they are not accepted as passing evidence.
