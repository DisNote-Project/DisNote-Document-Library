# Go SDK integration foundation - 2026-11-17

This checkpoint adds an executable cross-language contract to the TypeScript
library and creates the initial standalone module at `../DisNote-Go-SDK` for
Gin and Uber Fx applications. It is an integration foundation, not a claim that
the current NestJS document bounded context has already been replaced.

## Acceptance ledger

| ID | Behavior | Evidence | Status |
|---|---|---|---|
| GO-SDK-01 | TypeScript and Go share a versioned document/checksum contract | `contracts/go/v1`; TypeScript contract test; export script; identical exported hashes | Proven at TypeScript boundary; Go runtime pending |
| GO-SDK-02 | Go models preserve optional-field presence and unknown block props | pointer-backed optional slices/maps and `map[string]any` props; fixture-based Go test source | Implemented; Go test not executed |
| GO-SDK-03 | Go validates schema, metadata, block IDs/depth, inline types, URLs, marks and colors | `validation.Validator`; valid/invalid fixture tests | Implemented; Go test not executed |
| GO-SDK-04 | Go canonical JSON/checksum matches TypeScript | manifest SHA-256 vector; raw and typed checksum assertions | TypeScript vector proven; Go assertion not executed |
| GO-SDK-05 | Go document revisions support CAS, immutable copies and idempotent retry | repository interfaces, memory adapter and revision service tests | Implemented; Go test not executed |
| GO-SDK-06 | Authorization fails closed inside the Go service boundary | injected `revision.Policy`; create/read/write checks; no default allow policy | Implemented; Go test not executed |
| GO-SDK-07 | Gin exposes create/read/save without owning business logic | optional `transport/gin` handler with trusted actor context and stable error codes | Implemented; Go build not executed |
| GO-SDK-08 | Uber Fx composes replaceable Go dependencies | optional `fxmodule`; host must supply the policy and may replace the repository | Implemented; Go build not executed |
| GO-SDK-09 | MongoDB and PostgreSQL use the same repository contract | official MongoDB v2 adapter and `database/sql` PostgreSQL adapter with unique slug/locale plus CAS | Implemented; live DB and Go build pending |
| GO-SDK-10 | Collaboration tokens/control packets remain compatible | HMAC/base64url vector from the TypeScript reference, document scoping, packet validation and opaque update-store port | Implemented; Go test not executed |
| GO-SDK-11 | Go code graph has complete local AST endpoints | Graphify code-only extraction: 157 nodes, 371 raw edges, zero missing/dangling/external endpoints | Proven by Graphify; not a compiler substitute |
| GO-SDK-12 | Go module is publishable from a public semantic tag | module path, license and README are present | Partial; no Go toolchain, tag, push or pkg.go.dev indexing |

## Implemented boundaries

### TypeScript document library

- `contracts/go/v1` is the canonical release fixture bundle.
- `scripts/export-go-contract.mjs` copies only manifest-declared fixtures and
  rejects unsupported or incomplete manifests.
- `packages/disnote/test/contracts/go-contract.test.ts` validates every fixture
  and locks the TypeScript canonical SHA-256 value.

### Standalone Go module

- Module: `github.com/DisNote-Project/disnote-go`.
- Domain packages do not import Gin, Fx, MongoDB or PostgreSQL.
- Transport, DI and database implementations are optional leaf adapters.
- Server actors come from trusted Gin context, while permission decisions remain
  mandatory in the service through an injected policy.
- MongoDB and PostgreSQL writes atomically compare the aggregate CAS revision.
- Yjs document updates remain opaque binary data. The SDK does not claim semantic
  merge or compaction compatibility.

## Fresh verification

From `DisNote-Document-Library`:

- focused Go contract test: 1 passed, 0 failed;
- full `npm test`: 204 passed, 9 configured environment skips, 0 failed;
- `npm run build`: exit 0;
- `npm run lint`: exit 0 with zero warnings;
- exported Go fixture hashes match the TypeScript source files.

From `DisNote-Go-SDK`:

- Graphify code-only extraction parsed 20 code files and produced 157 nodes plus
  371 raw edges;
- graph diagnostics report zero missing, dangling or external endpoints.

The host has no `go`, `gofmt`, `gopls` or running Docker daemon. Therefore
`go mod tidy`, `gofmt`, `go test ./...`, `go vet ./...`, dependency resolution,
Gin/Fx compilation and live MongoDB/PostgreSQL tests are blocked. No Go quality
gate, publication, production deployment, commit or push is claimed.

## Next release gate

Install Go 1.25 or run CI with Go 1.25, then execute:

```bash
go mod tidy
gofmt -w .
go test -race ./...
go vet ./...
```

After those pass, add live MongoDB/PostgreSQL contract tests and a two-client
WebSocket replay/revocation test before tagging `v0.1.0`.
