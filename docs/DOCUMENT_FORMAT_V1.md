# DisNote Document Format V1

## Envelope

```ts
interface DisNoteDocument {
  format: "disnote-document";
  schemaVersion: number;   // current V1 = 1
  id: string;
  blocks: DisNoteBlock[];
  metadata: DocumentMetadata;
}
```

Persisted documents contain only JSON-safe values (no functions, class
instances, `Date`, `Map`/`Set`, React elements, DOM nodes, blobs, or editor
instances). Dates are ISO-8601 strings.

## Block

```ts
interface DisNoteBlock {
  id: string;
  type: string;
  version: number;
  props: Record<string, JsonValue>;
  content?: DisNoteInline[];
  children?: DisNoteBlock[];
}
```

### Invariants

- `id` unique within the document.
- `type` non-empty; `version` a positive integer.
- `props` always present.
- `children` contains no cycle; depth within the preset policy.
- Unknown block types are preserved on read/migrate.

## V1 block types

`paragraph`, `heading`, `bulletListItem`, `numberedListItem`, `checklistItem`,
`quote`, `codeBlock`, `image`, `divider`, `callout`.

## Inline content

`text`, `link`, `mention`, `reference`. Marks: `bold`, `italic`, `underline`,
`strike`, `code`, `textColor`, `backgroundColor`.

## Presets

A preset configures capabilities (`comments`, `collaboration`, `publishing`),
`maxDepth`, and `allowedExternalHosts`. Presets never invent a new format.
`article`, `legal`, `workspace` ship in V1.
