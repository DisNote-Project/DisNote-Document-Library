# npm release readiness — 2026-11-19

Verdict: local compile/lint/unit/example/package gates pass; final release approval
remains blocked on browser, live database and registry evidence. No npm publish
was attempted. Source versions were deliberately left for the Changesets release PR.
This is a release-tooling and packaging audit, not exhaustive product parity proof.

## Acceptance ledger and implementation map

| ID | Acceptance / boundary | Evidence / owner | Status |
| --- | --- | --- | --- |
| REL-01 | Library compile and lint | root build/typecheck; eslint with zero warnings | proven |
| REL-02 | Unit/contract behavior | npm test: 213 total, 204 pass, 0 fail, 9 configured environment skips | partial: skipped integration boundaries |
| REL-03 | Supported example builds | legal Nest + collaboration server typechecks, React Vite, Next and Storybook via npm run verify, exit 0 | proven |
| REL-04 | All public artifacts can pack | release:pack-check succeeds for core/react/sheets; export-target inventory checks 847/12/55 files, README/LICENSE present, no tests/stories/env/build-cache | proven for file inventory; isolated install remains unverified |
| REL-05 | Every package checked before publish | scripts/release-preflight.mjs discovers non-private packages with registry fallback and per-command timeout; React registry explicit; release command gates E2E and all package packs | implementation proven by inspection/lint; online preflight blocked |
| REL-06 | Browser editor integration | npm run test:e2e started but could not complete; direct localhost probe reports socket access forbidden; run cancelled | blocked, no browser pass claimed |
| REL-07 | Registry/version/security readiness | npm view of all three and npm audit --omit=dev fail ENOTFOUND registry.npmjs.org; changeset status lists all three for minor | partial; npm access, current versions and fresh vulnerability count unverified |
| REL-08 | Remote source delivery | git ls-remote fails getaddrinfo; final push result reported separately | blocked until remote reachable |

Library UI/API/storage/realtime behaviors beyond the existing automated suites were
not independently certified. Eight skipped tests are opt-in MongoDB integration
coverage; one WebSocket test skips because loopback sockets are unavailable. Existing CI provisions a MongoDB replica set; require its result along
with browser coverage before merging the version PR. Go SDK runtime verification
is outside the npm packages' release scope.

## Repairs

- Include React in preflight (automatic public package discovery) and dry-run pack checks.
- Give React an explicit npm registry; retain registry fallback for future packages.
- Gate the release command on E2E and all three packs before publishing.
- Replace sheets' repository-relative license pointer with a standalone Apache notice.
- Update both release guides for the three-package Changesets process.

Local manifests: core 0.7.0, React 0.1.0, sheets 0.1.0. Pending changesets request
minor bumps for all three; expected versions are 0.8.0 / 0.2.0 / 0.2.0, subject to
version-packages output and an online registry check. No versions were bumped here.

## Reproduction

```powershell
npm run verify
npm run test:e2e
npm run release:pack-check
npm audit --omit=dev
npm run release:status
```

Build output contains upstream ignored use-client directives, large-chunk warnings,
and the builds still exit 0.
If npm's configured cache is outside a writable location, set a local cache for
checks: `$env:npm_config_cache = Join-Path $PWD '.npm-cache'`.

The Vietnamese [release guide](PUBLISH_NPM_VI.md) provides publication instructions.
