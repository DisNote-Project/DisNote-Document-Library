# Database automations

`DatabaseAutomationService` is a server-side service over `DatabaseRepository`.
Inject policy assertions, an actor-scoped `DatabaseService` factory and optional
webhook delivery. Expose the narrow `DatabaseAutomationProvider` to React and
mount `DatabaseWorkbench` with management permission to configure rules.

## Contract

- Triggers: record created, record updated, property changed, one-time schedule
  or recurring schedule (minimum one minute). No delete or arbitrary-script trigger.
- Optional typed database filter is evaluated against the current authorized row
  when the first action runs, rather than against a historical event payload.
- Actions run in order: patch the source row, create a row in the same database,
  or send selected current fields to a registered webhook target.
- Source writes and queued receipts share the same repository CAS. Each database
  action and its completed-step checkpoint share a CAS. A whole multi-action rule
  is not a single transaction; earlier completed actions remain if a later one fails.
- Worker database writes do not trigger other automations. This bounds recursion.
- Rule ownership comes from the trusted configuration actor. Read/configure/retry
  expose only that actor's rules and receipts; another manager's rules are retained.
  Workers recheck current management and source-row read/write permissions for
  every step. Recipients of relation/person assignments are validated by the domain.
- Configuration uses a database revision. Remote changes preserve the editor draft
  and require explicit reload. A polling response must not overwrite unsaved input.

## Durable execution

Call `tick(databaseId)` from a host worker, including after restart. A persisted
30-second lease protects a claimed job; another worker can recover an expired
lease. Per-step failures retry with bounded exponential delay, at most five
attempts before failure. Manual retry retains the same job/step identity.

Webhook delivery is **at least once**. An accepted request whose acknowledgment
is lost can be sent again. The receiver must deduplicate the stable idempotency
key (`jobId:step`); no exactly-once external effect is promised. The host must
enforce URL/secret policy, payload size, timeout and network destination safety.
The SDK accepts a target ID and injected delivery function, never user scripts.

Schedules persist UTC instants; React edits them in local time. Missed recurring
slots coalesce into the latest due occurrence. Each occurrence keeps a stable
record-ID list and fans out in bounded chunks. One-time schedules run once.
Revoked owners cannot execute effects. There are at most 50 rules, 10 actions per
rule, 1,000 queued/history jobs and 200 retained terminal receipts per database.
An exhausted queue rejects the source mutation rather than silently losing work.

## Host integration

DisNote-Backend exposes authenticated GET/PUT
`document-channels/:channel/databases/:database/automations` and POST
`.../automations/:job/retry`. Its worker uses Mongo snapshots and fresh actor ACLs.
`DOCUMENT_AUTOMATION_WEBHOOKS` is an administrator-only JSON array with target
`id`, `label`, HTTPS `url` and a secret of at least 32 characters. Browser responses
contain only ID/label. Requests carry timestamp, HMAC signature and idempotency key;
DNS addresses are checked and pinned, redirects refused, responses bounded.

The standalone Demo persists rules/jobs in Mongo and runs a server timer even
without an open editor. It is a single-user reference policy and offers no
registered webhook destinations by default. It is not production authentication.

## NEXT-06 acceptance boundaries

| ID | Boundary | Evidence |
|---|---|---|
| NEXT-06-A | Typed trigger/condition/action validation and atomic source enqueue | `test/database/automation.test.ts` |
| NEXT-06-B | Leases, per-step CAS, crash/retry identity and permissions | SDK automation tests; host `document-automation.service.spec.ts` |
| NEXT-06-C | Schedule catch-up/fan-out and owner-scoped receipts/configuration | SDK automation tests |
| NEXT-06-D | HTTPS registry, credential redaction and destination rejection | host `registered-document-webhooks.spec.ts` |
| NEXT-06-E | Configuration/editor persistence and server worker through HTTP/Mongo | product `e2e/documents.spec.ts`; Demo `e2e/database-workbench.spec.ts` (record actual latest run in queue) |

External HTTPS delivery and receiver behavior require deployment-specific evidence.
Fixture receipt deduplication does not prove an external production integration.
