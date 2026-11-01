# Database workbench and record documents

```tsx
import { DatabaseWorkbench } from '@disnote/core/database/react';
import '@disnote/core/database/styles.css';

<DatabaseWorkbench databaseId={databaseId} provider={authorizedProvider}
  locale="vi" canManage={permissions.manageDatabase}
  readonly={!permissions.writeDatabase} onOpenRecord={openRecord} />
```

The provider separates query, record upsert/delete, atomic `mutate`, all-record
`aggregate`, configured `submitForm` and optional committed-change `subscribe`.
Only expose capabilities the actor has. UI flags are affordances; authoritative
server policies must still derive the actor from trusted identity and authorize
every request. The demo's HTTP snapshot repository and allow-all policies are
local reference adapters, not an authenticated production API.

## Edits and layout

`DatabaseService.mutate(actor,id,commands,revision)` applies bounded patch/delete/
move/property/view commands against a private snapshot and commits one CAS.
Any invalid value, denied record or stale revision prevents the whole batch.
Patches preserve unrelated fields, including relations hidden by read projection.
Inline cells retain their draft and captured revision on conflict. Cancelling
and reopening/reloading is required before replacing a newer value; no automatic
overwrite is performed. The full record edit form sends only changed values.

Table rows and columns have keyboard move controls; records/columns also support
drag. Kanban accepts record drops on a group. Calendar accepts drops on a day;
moving a configured range preserves its duration. Timeline supports pointer drag,
date inputs and left/right arrow rescheduling. Sorting can override manual order;
the stored order remains available when sort is cleared.

Named views persist kind, query/filter/sort/group, ordered/hidden column widths,
chart configuration and form fields. Database blocks can reference `viewId` to
display the named view. Missing providers/deleted views show an explicit fallback.
Configuration changes use manage policy and CAS. Property changes prune removed
field references from saved views; dependent formula/rollup definitions must still
be made valid explicitly. The UI provides nested filter groups, multiple sorts,
property editors and a bounded advanced JSON configuration for computed properties.

## Formula and relationship editing

`FormulaEditor` edits a typed AST with constants, property references, functions
and lazy conditionals. The 34 supported operators are exported as
`FORMULA_OPERATORS`; text/list/numeric/date functions never evaluate JavaScript,
regular expressions, network requests or the current clock. Dates use UTC days.
The UI bounds nesting/arguments; advanced JSON retains access to deeper valid ASTs.
Invalid types, arities, arithmetic overflow and oversized generated results fail.

Relation fields search the target database through the injected permission-aware
query provider and page candidates in groups of 50. Selected IDs survive paging.
Person fields can use `DatabaseViewProvider.searchPeople`; hosts must authorize
directory access and current database visibility. `DatabasePolicy.canAssignPerson`
validates new assignments at write time. Without a people provider the existing
ID input remains available; the SDK does not invent a user directory.

## Task relationships and scheduling

Records may have a parent and dependency IDs. The `task` command applies deltas,
preserving references hidden from the current actor. Parent/dependency cycles,
self links, missing targets and more than 100 dependencies are rejected. Queries
and record pages redact unreadable references; `parentId`/`dependsOn` queries apply
after that projection. Record dialogs expose parent/dependency editing and paged
subitems with host-supplied navigation.

Managers configure `taskSchedule` with date properties and `autoShift`. Scheduling
is forward only: a dependent starts no earlier than its latest predecessor ends,
with a one-day gap for date-only values. Existing duration is preserved. Records
without a start date remain unscheduled. Every changed dependent requires current
read/write permission; any denial, cycle, invalid range or CAS conflict rolls
back the entire mutation. This is not a business-calendar/holiday engine. The
service uses iterative DAG traversal and bounds snapshot/edge sizes.

## Charts and forms

Charts support bar, line and donut presentation with accessible numeric data.
Aggregation covers the authorized filtered snapshot, not just the visible record
page. Each aggregate reads one source snapshot; negative donut metrics produce an
explicit message. Chart groups are paged in sets of 50. The reference repository
is still bounded to 10,000 records and is not a server indexed engine.

A form must be saved/configured before submission. The service checks its allowed
field list, required values, property types, write policy and expected revision.
Responses insert a new record and cannot update a record by reusing its ID.
Public/anonymous form links are not enabled by this private form API; delegated
public submission requires the separate sharing/publishing policy work.

## Record documents

`RecordPageService` composes a row access abstraction and a revision repository.
Its canonical document ID is a SHA-256 namespace of database ID and record ID.
Every open/save/history/revision/restore checks current row access. Reading a row
with no document returns an empty page without creating a record on behalf of a
read-only actor. Saving the first document initializes its history; subsequent
saves use revision CAS and actor/content-scoped retry receipts. Restoring appends
a new revision rather than changing old content.

`RecordPageDialog` presents row properties, editor, comments and history. Property
saves preserve an unsaved body draft. Property and document saves are currently
separate CAS commits; document history restores body content, not a transaction
across row properties/comments. Comment providers require their own current
record/document policy. Read-only pages use `DocumentView` rather than mounting
the editor runtime.

Implementation: `src/database/{model,commands,dates,views,service,validation,record-pages}`
and `src/database/react`. Acceptance/remaining queue: `NOTION_COMPLETION_QUEUE.md`.
Demo supports `?database=<id>#workspace` for separate local databases. Browser tests
create generated fixture IDs and remove only those exact Mongo snapshot/history/
comment IDs after each scenario.
