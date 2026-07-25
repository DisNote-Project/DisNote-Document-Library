# Migration guide

Three independent version axes:

```
library:  @disnote/document-core@0.1.0
document: schemaVersion = 1
block:    callout@1
```

Register migrations:

```ts
const migrations = createMigrationRegistry()
  .registerDocumentMigration(0, 1, migrateDocumentV0ToV1)
  .registerBlockMigration("callout", 1, 2, migrateCalloutV1ToV2);
```

Rules: migrations are deterministic, make no network calls, do not depend on the
current user, are idempotent at the target version, migrate one version per
step, and never drop unknown props without an explicit policy. Keep before/after
fixtures for every migration. A failing migration must never mutate the source.
