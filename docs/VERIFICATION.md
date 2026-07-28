# Verification and Compatibility

This file records what the repository verifies in CI. It is the source of truth
when older roadmap documents describe a package as a scaffold.

## Supported runtime

- Node.js 20.19 or newer
- React 18.3 or React 19
- BlockNote 0.52.1 for `@disnote/core/editor` and `/editor/react`
- Yjs 13.6 for `@disnote/core/collaboration`

## What `npm run verify` checks

1. TypeScript project references compile in strict mode.
2. ESLint runs with zero warnings.
3. Unit, security, round-trip, repository contract and collaboration tests pass.
4. Every library package emits ESM, declarations and source maps.
5. The NestJS/Mongo and collaboration server examples typecheck.
6. The Vite React editor demo builds with the editor in a lazy-loaded chunk.
7. The Next.js SSR demo builds and generates its sitemap.
8. Storybook builds as a static site.

CI additionally:

- runs the browser editor suite on desktop Chromium and a Pixel viewport;
- exercises IME/Unicode input, clipboard, undo/redo and mobile overflow;
- starts MongoDB as a replica set and runs the real repository/update-store
  integration tests;
- verifies every public package tarball contains its README and license;
- checks production dependencies with `npm audit --omit=dev`;
- requires `packages/disnote/dist/editor/react/index.js` to exist.

## Implemented extension points

- Core block definitions: validation, migration and plain-text projection.
- React block renderers: `DocumentRenderer.blockRenderers`.
- HTML block renderers: `policy.blockRenderers`.
- Native block renderers: `DocumentNativeRenderer.blockRenderers`.
- BlockNote schema bridge: native blocks plus `disnoteBlock`, mention and
  reference specs.

## Persistence guarantees

The in-memory repository and transactional Mongo example support optimistic
concurrency, idempotent draft writes, immutable revisions and explicit publish
pointers. MongoDB transactions require a replica set or sharded cluster. The
Mongo contract test is skipped locally unless `DISNOTE_TEST_MONGO_URI` is set;
CI always supplies a real replica-set URI.

## Collaboration reference

`examples/collaboration-server` demonstrates document-scoped HMAC
authentication, binary WebSocket updates, durable Mongo update storage,
reconnect synchronization, distributed compaction leases, payload limits,
health checks and Prometheus metrics. It is a reference deployment boundary,
not an identity-service replacement.

Run the complete verification locally:

```bash
npm ci
npx playwright install chromium
npm run verify
npm run test:e2e
npm audit --omit=dev
```
