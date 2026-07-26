# Releasing `@disnote/core`

Releases use Changesets and the `Release packages` GitHub Actions workflow.
The npm package is public and the repository secret `NPM_TOKEN` supplies the
publish credential.

## Normal release

1. Add a changeset with `npm run changeset` whenever a published API changes.
2. Merge the changeset into `main`, or run `Release packages` manually from the
   GitHub Actions page.
3. Changesets opens or updates the `chore: release packages` pull request.
4. Review the generated package version and `CHANGELOG.md`, then merge that pull
   request.
5. The next `Release packages` run publishes the new version to npm and creates
   the corresponding git tag.

The current pending changeset is a minor release, so `@disnote/core` moves from
`0.4.2` to `0.5.0`.

## Local checks

```bash
npm ci
npm run release:status
npm run verify
npm pack --workspace @disnote/core --dry-run
```

`npm run version-packages` is normally run by GitHub Actions. It updates package
versions, changelogs, and the npm lockfile together so the release pull request
always passes `npm ci`.

## Emergency local publish

Only use this when GitHub Actions is unavailable:

```bash
npm login
npm run version-packages
npm run release
```

Review and commit all generated version, changelog, and lockfile changes before
publishing. Never commit an npm token or a generated `.npmrc`.
