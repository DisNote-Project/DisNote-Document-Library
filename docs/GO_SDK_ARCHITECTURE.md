# DisNote Go SDK architecture

Status: the integration foundation is implemented in `../DisNote-Go-SDK` and
tracked in `GO_SDK_IMPLEMENTATION_2026-11-17.md`. Go compilation/runtime evidence
remains blocked until a Go toolchain or CI runner is available.

## 1. Decision

Create a dedicated public Go module in its own repository:

```text
Repository:  github.com/DisNote-Project/disnote-go
Module:      github.com/DisNote-Project/disnote-go
License:     Apache-2.0
First tag:   v0.1.0
```

The TypeScript packages remain the canonical editor and rendering implementation.
The Go module owns server contracts, validation, application ports, persistence,
Gin transport and Uber Fx composition. Both implementations must be tested against
the same versioned fixtures instead of duplicating undocumented behavior.

Do not place the Go module inside the npm package tree. A separate repository gives
Go consumers a short import path, simple `vX.Y.Z` tags and an independent release
cadence without coupling npm and Go releases.

## 2. Compatibility boundary

| Capability | TypeScript owner | Go owner | Shared contract |
|---|---|---|---|
| Editor and BlockNote conversion | `@disnote/core/editor` | None | `DisNoteDocument` JSON |
| React/native rendering | `@disnote/core/renderer/*` | None | `DisNoteDocument` JSON |
| Schema model and validation | Canonical implementation | Native mirror | Versioned schema fixtures |
| Migration | Canonical implementation | Native mirror for server-supported versions | Migration fixtures |
| Document CRUD/revisions | Client contracts | Application service | HTTP/OpenAPI contract |
| Authorization | UI hints only | Authoritative policy | Actor/resource/action inputs |
| MongoDB/PostgreSQL | Structural TypeScript adapters | Native Go adapters | Repository contract tests |
| Realtime collaboration | Yjs client/provider | Auth, persistence and broadcast | Binary update + JSON presence protocol |
| Yjs semantic merge/compaction | Yjs runtime | Opaque unless proven compatible | Cross-runtime binary corpus |

Go must never persist BlockNote, ProseMirror or React-specific objects. The durable
format is the validated, versioned `DisNoteDocument` JSON contract.

## 3. Proposed Go package layout

```text
disnote-go/
  go.mod
  LICENSE
  README.md
  document/
    model.go
    inline.go
    block.go
    metadata.go
    errors.go
  validation/
    validator.go
    limits.go
  migration/
    registry.go
    v1.go
  canonicaljson/
    encode.go
    checksum.go
  revision/
    model.go
    service.go
    repository.go
  workspace/
    service.go
    repository.go
    policy.go
  comments/
    model.go
    service.go
    repository.go
  database/
    model.go
    service.go
    repository.go
  collaboration/
    protocol.go
    token.go
    store.go
    hub.go
  storage/
    mongo/
    postgres/
  transport/
    gin/
      routes.go
      handlers.go
      middleware.go
      errors.go
    websocket/
      handler.go
  fxmodule/
    module.go
    config.go
  contracttest/
    fixtures.go
    repository.go
  testdata/
    contracts/
      manifest.json
      documents/
      migrations/
      canonical-json/
      collaboration/
  internal/
    ...
```

Public packages must stay small and capability-oriented. Concrete database,
transport and DI packages depend on domain ports; domain packages must not import
Gin, Fx, MongoDB or PostgreSQL.

## 4. Core interfaces

The SDK exposes narrow ports rather than a single large repository:

```go
package revision

type Reader interface {
    Get(ctx context.Context, id string) (State, error)
    FindBySlug(ctx context.Context, slug, locale string) (State, error)
}

type Writer interface {
    Create(ctx context.Context, state State) (bool, error)
    CompareAndSwap(ctx context.Context, state State, expected uint64) (bool, error)
}

type Repository interface {
    Reader
    Writer
}
```

Application services receive these ports through constructors. Gin handlers only
decode, validate transport input, call a use case and map its result. Authorization
uses a trusted actor obtained from middleware; an actor ID or permissions supplied
inside the request body are never authoritative.

## 5. Gin and Uber Fx integration

The optional `fxmodule` package provides named constructors without hiding the
domain APIs:

```go
app := fx.New(
    disnotefx.Module,
    fx.Provide(
        loadConfig,
        newMongoClient,
        newActorResolver,
        newDocumentPolicy,
    ),
    fx.Invoke(mountApplicationRoutes),
)
```

`disnotefx.Module` should provide:

- document validator and migration registry;
- revision/workspace/comment services;
- MongoDB or PostgreSQL repository selected by explicit configuration;
- collaboration update store and room hub;
- Gin route registrar;
- lifecycle hooks for database indexes, WebSocket shutdown and background workers.

Uber Zap integration belongs in an adapter accepting a small SDK logger interface.
The domain layer must not import Zap directly.

## 6. HTTP contract

The Go SDK ships an OpenAPI document generated or verified from contract source.
At minimum it covers:

- get/create/save/publish document;
- optimistic revision conflict (`409` plus current revision);
- idempotency key handling for mutations;
- workspace pages and shared sources;
- comments and anchor validation;
- database records/views/automations;
- collaboration grant creation;
- consistent problem response with stable machine-readable codes.

The existing frontend HTTP adapter must pass unchanged against both the current
Node backend and the Go conformance server before a cutover is accepted.

## 7. Realtime and Yjs

The first Go release treats Yjs updates as opaque byte sequences:

- authenticate the WebSocket before joining a document room;
- bind the connection to a trusted actor and permitted document;
- enforce maximum text/binary payload sizes;
- persist a binary update before broadcasting it;
- replay ordered durable updates on reconnect;
- keep awareness/presence ephemeral;
- rebuild presence identity on the server rather than trusting user/color values;
- remove presence on disconnect, expiry or authorization revocation.

Presence control packets retain the current JSON shapes (`awareness`, `request`,
`leave`). Document changes retain their exact binary payload.

Semantic merge, snapshot creation and compaction are not considered compatible
until the result is compared byte/behavior-wise with the supported Yjs version.
Until then, use append-only updates with bounded retention or invoke a small Yjs
compaction worker behind an internal port. This worker is an implementation detail,
not part of the public Go API.

## 8. Contract synchronization

The TypeScript repository exports a release fixture bundle containing:

- valid and invalid documents at every supported schema version;
- expected validation issue codes and JSON paths;
- migration inputs and exact canonical outputs;
- canonical JSON and checksum vectors;
- revision/idempotency/concurrency scenarios;
- WebSocket control packets and binary update corpus;
- OpenAPI compatibility snapshots.

The bundle has its own contract version. CI in both repositories downloads or
pins the same bundle. A release is blocked if either implementation disagrees.
The Go SDK must fail closed on unknown schema versions and preserve unknown block
payloads according to the TypeScript contract.

## 9. Versioning and release

The Go module is published from Git tags, not npm:

```powershell
go mod tidy
go test ./...
go vet ./...
git tag v0.1.0
git push origin v0.1.0
$env:GOPROXY='https://proxy.golang.org'
go list -m github.com/DisNote-Project/disnote-go@v0.1.0
```

After the proxy indexes the tag, documentation appears on:

```text
https://pkg.go.dev/github.com/DisNote-Project/disnote-go
```

Consumers install it with:

```powershell
go get github.com/DisNote-Project/disnote-go@v0.1.0
```

Never move or overwrite a published tag. Publish a new version. Keep the module at
`v0.x` while APIs are experimental. At `v1.0.0`, compatibility becomes a release
contract. A future `v2` module path must end in `/v2`.

For a private SDK, keep the GitHub repository private and configure `GOPRIVATE`
plus Git credentials. `pkg.go.dev` is for public discovery and is not a private
package registry.

## 10. Delivery phases

| Phase | Scope | Exit evidence |
|---|---|---|
| GO-SDK-01 | Contract bundle, Go models, validation, canonical JSON | Cross-language fixture parity |
| GO-SDK-02 | Revision repository ports, memory/Mongo/PostgreSQL adapters | Contract, concurrency and live DB tests |
| GO-SDK-03 | Workspace/comments/database application services | Policy and idempotency tests |
| GO-SDK-04 | Gin transport and OpenAPI | Existing frontend adapter conformance |
| GO-SDK-05 | Fx module and lifecycle | Start/stop and dependency replacement tests |
| GO-SDK-06 | WebSocket auth, persistence, replay and presence | Two-client reconnect/revocation tests |
| GO-SDK-07 | Yjs compaction boundary | Cross-runtime corpus and load proof |
| GO-SDK-08 | Public release | CI green, license/docs, tag and pkg.go.dev indexing |

## 11. Acceptance ledger

| ID | Requirement | Current status |
|---|---|---|
| GO-ARCH-01 | Go integrates without importing Node packages | Implemented; Go build pending |
| GO-ARCH-02 | Gin is an optional transport adapter | Implemented; Go build pending |
| GO-ARCH-03 | Uber Fx composes replaceable dependencies | Implemented; Go build pending |
| GO-ARCH-04 | MongoDB/PostgreSQL preserve revision CAS | Implemented; live database proof pending |
| GO-ARCH-05 | TypeScript and Go share executable contracts | TypeScript side proven; Go execution pending |
| GO-ARCH-06 | Realtime preserves current binary/control protocol | Token/control/update-store contract implemented; live WebSocket runtime pending |
| GO-ARCH-07 | Authorization is enforced at Go server boundaries | Fail-closed service policy implemented; Go execution pending |
| GO-ARCH-08 | Module has an independent public release path | Module prepared; repository/tag/pkg.go.dev publication pending |

No row is marked proven until fresh Go tests and cross-language conformance runs
produce evidence. Existing TypeScript gates do not prove the Go implementation.
