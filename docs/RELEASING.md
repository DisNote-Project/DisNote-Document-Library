# Releasing DisNote packages

Public workspaces: `@disnote/core`, `@disnote/react`, `@disnote/sheets`.
The root is private; do not publish it.
See [the release instructions](PUBLISH_NPM_VI.md) and
[the current readiness ledger](RELEASE_READINESS_2026-11-19.md).

## GitHub Actions

Configure the Actions secret `NPM_TOKEN` with publish access to all three packages
and authentication meeting npm's current requirements. The workflow uses a token;
OIDC trusted publishing requires separate configuration.

Push changesets to main. The release workflow creates a version PR. Review its
versions, changelogs, lockfile and React's dependency on core. Require the CI job
(including MongoDB integration and browser tests) to pass before merging.
The next main run performs preflight, verify, E2E and pack checks, publishes through
Changesets in dependency order and pushes tags. Verify each package on npm.

## Manual fallback

Disable the release workflow first to prevent simultaneous publishing.
Run each command only if the previous succeeds:

```powershell
npm ci
npm run release:status
npm run version-packages
git diff
npm run verify
npm run test:e2e
npm run release:pack-check
git add .changeset packages/disnote packages/react packages/sheets package-lock.json
git diff --cached --check
git commit -m "chore: version document packages"
git push origin main
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm run release
```

Review generated changes before committing. Preflight requires clean main matching
origin/main, npm authentication and unpublished versions of every public package.
Never commit credentials. If a publish is interrupted, inspect the registry before
recovery: preflight deliberately rejects versions that have already published.
Re-enable the workflow after a successful manual release.
