# Standalone DisNote demo integration

The workspace sibling `DisNote-Document-Demo` now consumes the current packed
`@disnote/core` through a vendored tarball. Its default workspace composes database,
workspace/shared sources, comment/history/offline, tab collaboration, AI preview
and print surfaces from public SDK exports. Existing document/folder editing is
retained under `#documents` without migrating or deleting the existing data.

The standalone Express adapter persists bounded snapshots in a separate Mongo
collection, enforces unique creation and revision CAS, validates snapshots and
provides an OpenAI-compatible AI endpoint using server-only configuration. This
is a loopback local demo with allow-all reference policies. It does not replace
the authenticated product backend or prove production authorization. Collaboration
between tabs and the Mongo-backed offline/history editor are separate examples.

After SDK changes, build it and pack the workspace into the demo's `vendor/`, then
install that file dependency there. Pin compatible BlockNote/Yjs/Tiptap peers;
sibling source symlinks can load multiple Yjs runtimes. The demo has its own
build, snapshot/Mongo tests and desktop/Pixel browser tests, including optional
live local model inference. Its source directory currently has no Git remote;
this repository's push contains the library and its own reference examples.

Acceptance map: `DisNote-Document-Demo/docs/INTEGRATION_ACCEPTANCE.md` in the
shared workspace. Package publication and deployments remain separate actions.
