# Governance

## Roles

- **Maintainers** review and merge changes, cut releases, and steward the schema.
- **Contributors** propose changes via pull requests.

## Decision making

Routine changes: lazy consensus among maintainers. Schema changes: a Schema RFC
(see `.github/ISSUE_TEMPLATE/schema_rfc.md`) with a required migration and
before/after fixtures.

## Releases

SemVer via changesets. `0.x` allows fast iteration but always ships a changelog.
`1.0.0` only when: document schema V1 is stable, the migration framework is
proven, the public API is reviewed, there is a production consumer, security
docs exist, and the compatibility matrix is published.

## Support window

Each release keeps historical fixtures for every public schema version and
documents supported Node, React, and BlockNote ranges.

## Deprecation

Public API deprecations require a `@deprecated` JSDoc, a replacement, at least
one minor release of warning, a changelog entry, and a migration note.
