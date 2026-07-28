# Contributing

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Adding a block

1. Write a short RFC and fix the persisted shape + block version.
2. Add a fixture.
3. Write the core definition + props validator.
4. Add a migration if the shape changed.
5. Write renderers (React, HTML) and the editor adapter.
6. Add unit + round-trip tests.
7. Update docs.

## Rules

- The root `@disnote/core` entry must not import React, DOM, a database, or BlockNote.
- Never change the persisted meaning of an existing block version — bump the
  version and add a migration instead.
- Unknown blocks must be preserved, never converted to paragraphs.
- Public API changes require a changeset.
