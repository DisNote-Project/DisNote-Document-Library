# Persistence and customization foundation — 2026-11-15

This checkpoint turns MongoDB and PostgreSQL into replaceable persistence
boundaries and makes host-defined document presets first-class. It is a
foundation for the remaining Notion-comparison queue, not a claim of complete
Notion parity or production deployment.

## Acceptance ledger

| ID | Acceptance | Evidence | Status |
|---|---|---|---|
| DOC-PLATFORM-01 | Compose a custom preset from a built-in preset without mutating it | `defineDocumentPreset`; custom-block/host/depth/capability unit test | Proven at library boundary |
| DOC-PLATFORM-02 | MongoDB state has unique ID and slug/locale plus revision CAS | `MongoDocumentStateRepository`; index, conflict, stale/accepted write, read/slug tests | Proven with structural test double; live replica set pending |
| DOC-PLATFORM-03 | PostgreSQL has the same contract with JSONB and revision CAS | `PostgresDocumentStateRepository`; schema, unsafe-table, conflict, stale/accepted write, read/slug tests | Proven with structural test double; live PostgreSQL pending |
| DOC-PLATFORM-04 | Business logic can switch databases without importing a driver | Both factories construct `RevisionDocumentRepository` over `DocumentStateRepository` | Proven by TypeScript build |
| DOC-PLATFORM-05 | Server adapters are independent imports outside browser bundles | `@disnote/core/persistence/mongodb` and `/postgres` package exports | Proven by package build |
| DOC-PLATFORM-06 | Full Notion-comparison scope is complete | NEXT-08..12 and production/native/load boundaries remain | Partial |
| DOC-PLATFORM-07 | WebSocket error/close cannot recurse or schedule duplicate reconnects | Transport detaches the error handler before close, clears stale socket ownership and permits one reconnect timer | Implemented; local loopback handshake unavailable for end-to-end proof |

## MongoDB

The adapter accepts the small `MongoDocumentStateCollection` port, implemented
structurally by a MongoDB collection. This keeps core free of a hard driver
dependency.

```ts
import { createMongoDocumentRepository } from "@disnote/core/persistence/mongodb";
import { workspacePreset } from "@disnote/core";

const { states, documents } = createMongoDocumentRepository({
  collection: mongo.db("disnote").collection("document_states"),
  registry: workspacePreset.registry,
});
await states.initialize();
```

Use majority writes and a replica set when a host transaction spans document
state and other domain aggregates.

## PostgreSQL

The `SqlExecutor` port is compatible with `pg` Pool/Client-style objects. The
adapter creates a JSONB table, validates custom table names, and uses an atomic
revision predicate.

```ts
import { createPostgresDocumentRepository } from "@disnote/core/persistence/postgres";
import { workspacePreset } from "@disnote/core";

const { states, documents } = createPostgresDocumentRepository({
  sql: pool,
  registry: workspacePreset.registry,
});
await states.initialize();
```

## Custom preset

```ts
const productPreset = defineDocumentPreset({
  id: "product-workspace",
  base: workspacePreset,
  blocks: [ticketBlock, sprintBlock],
  allowedExternalHosts: ["assets.example.com"],
  capabilities: { publishing: true },
});
```

The returned registry and host list are new values. The base remains unchanged,
so extensions can upgrade without patching core definitions.

## Remaining boundaries

- The aggregate adapter is for bounded histories. NEXT-12 still requires
  normalized retention/compaction and large-history load proof.
- Live MongoDB/PostgreSQL suites require service instances in CI.
- Guest/public sharing, managed offline pages, indexed workspace search,
  persisted workspace interchange and generated-PDF proof remain NEXT-08..11.
- Authorization must wrap repository calls with a trusted server actor; these
  adapters never accept client-supplied permissions.

## Fresh verification

- `npm run build`: pass.
- `npm run lint`: pass with zero warnings.
- Focused core/persistence run: 24 passed, 0 failed.
- Full unit runner: 185 passed, 8 optional Mongo skips, 1 failed. The failure is
  the authenticated WebSocket loopback test timing out during its initial
  handshake. A minimal Node/Undici loopback probe on this host also reports a
  non-101/network response before the server observes a connection. No complete
  test-gate claim is made.
