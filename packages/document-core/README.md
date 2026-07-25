# @disnote/document-core

The vendor-neutral heart of DisNote Document. Pure TypeScript — imports no
React, DOM, database, or BlockNote.

Provides the `DisNoteDocument` model, JSON-safe types, a block registry,
runtime validation, tree traversal, immutable transformations, a migration
framework, and canonical serialization (deterministic JSON, SHA-256 checksum,
plain-text + heading projection).

```ts
import {
  createDocument, appendBlock, updateBlock,
  heading, paragraph, text,
  validateDocument, canonicalJson, checksum, extractDocumentPlainText,
  createDefaultRegistry,
} from "@disnote/document-core";
```

See the repository root `docs/DOCUMENT_FORMAT_V1.md`.
