# Database presentation and diagram blocks

Database controls now expose `.disnote-db` and stable `__header`, `__board`,
`__column`, `__card`, `__pagination`, `__form` and `__table-scroll` hooks.
Import `@disnote/core/database/styles.css` for database-only styling, or
`@disnote/core/styles.css` for all document styles. Tokens use the same
`--disnote-background`, `--disnote-surface`, `--disnote-border`, `--disnote-text`,
`--disnote-text-muted`, `--disnote-radius`, `--disnote-font-size` contract.
Styles are optional and scoped; applications can override these selectors/tokens.

```tsx
import { diagram, createDocument } from '@disnote/core';
import { DiagramView } from '@disnote/core/diagrams/react';
import '@disnote/core/styles.css';

const document = createDocument({ blocks: [
  diagram('flowchart LR\n A[Document] --> B[Preview]', 'mermaid'),
] });
<DiagramView format="mermaid" code="flowchart LR\n A --> B" locale="vi" />;
```

In the editor, `/mermaid` or `/drawio` inserts a diagram. Open Diagram source
to paste/edit Mermaid code or draw.io XML. React preview renders locally and
updates after editing. Source is saved in a V1 `diagram` block with `format`
and `code` props. Existing authenticated host persistence must update its core
registry/package before accepting the new block type. The standalone demo uses
the refreshed package on both client and server.

JSON/ZIP preserve the block source. Markdown fences `mermaid`/`drawio` import
as diagram blocks and export as source fences. Static HTML and native rendering
show escaped/plain source; visual server SVG/PDF generation is not included.

Mermaid loads lazily, uses strict security and sanitizes SVG. Source directives
and frontmatter configuration are refused; generated styles and external image/
link elements are removed. Diagram typography/colors use local scoped CSS.

draw.io rendering uses local maxGraph, not a hosted iframe. It accepts an
`mxGraphModel` or `mxfile` containing raw XML or compressed pages, with a page
selector. It is a viewer for common mxGraph shapes/connectors, not the full
diagrams.net editor or complete proprietary stencil set. HTML labels are
flattened to text; external resources, image styles, executable codecs, DTDs,
entities and stencil expressions are rejected. Parsing limits: 200,000 source
characters, 1,000,000 decoded XML characters across pages (and bytes per inflated
page), 2,000 cells per page, 50 pages.
Invalid/unsupported source produces a localized error and preserves source.

Implementation map: `src/diagrams` owns formats, bounded XML decoding and view;
`src/core/registry/core-blocks.ts` validates shape; editor schema/adapter and
`DiagramEditor` own insertion/source editing; React renderer displays previews;
HTML/native/Markdown handle portable fallbacks. Database services and persistence
contracts are unchanged. Demo acceptance is tracked in adjacent
`DisNote-Document-Demo/docs/DATABASE_DIAGRAM_ACCEPTANCE.md`.

Primary references: [Mermaid usage](https://mermaid.js.org/config/usage),
[maxGraph XML codecs](https://maxgraph.github.io/maxGraph/docs/usage/codecs/).
