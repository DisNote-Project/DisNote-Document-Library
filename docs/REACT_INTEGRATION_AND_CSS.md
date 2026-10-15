# React integration and CSS customization

These APIs are available in the current source/packed build. `@disnote/react` is a
new workspace package and must be released together with a matching core version
before the registry install below is available. No npm publication is implied.

## Basic editor: three steps

In an existing React 18.3+/19 application:

```sh
npm install @disnote/react
```

```tsx
'use client';

import { DocumentEditor } from '@disnote/react';
import '@disnote/react/styles.css';

export function Notes() {
  return <DocumentEditor onChange={document => saveToYourBackend(document)} />;
}
```

The package installs compatible editor/multicolumn/Yjs dependencies. React and
React DOM come from your app. Basic editing needs no registry, provider, backend
SDK or initial document. `onChange` returns vendor-neutral DisNote JSON; storage,
debouncing, authentication and error reporting remain application responsibilities.

To open an existing document, pass `initialDocument`. This is an uncontrolled
editor: parent rerenders and style changes preserve content/selection. Change its
React `key` when intentionally replacing the entire document or editor locale.
In Next.js App Router, keep handlers/state in a client component. The facade
renders a matching loading state on the server and mounts the editor runtime
after hydration. Build server-side documents with builders from `@disnote/core`;
the React component entries are client boundaries.
The forwarded ref supports the same focus/getDocument/insertBlock methods as
`DisNoteEditor`. Existing advanced APIs remain available through `@disnote/core`.

## Read-only installation

Applications that only display documents do not need editor packages:

```sh
npm install @disnote/core
```

```tsx
import { DocumentView } from '@disnote/core/react/view';
import '@disnote/core/styles.css';

<DocumentView document={document} />
```

The default registry is optional. Supply `registry`/`blockRenderers` for your own
blocks. This dedicated entry has no editor imports in its build graph. The
combined `@disnote/core/react` and `@disnote/react` entries also expose DocumentView,
but the convenience package deliberately installs editor dependencies.

## Customize with ordinary CSS

Import the optional stylesheet once. It only targets DisNote surfaces; it does
not reset application `body`, buttons or headings outside those surfaces. Its
base rules use low specificity. Import your own stylesheet after it.

```tsx
<DocumentEditor className="brand-notes" />
<DocumentView className="brand-notes" document={document} />
```

```css
.brand-notes {
  --disnote-font-family: 'Inter', system-ui, sans-serif;
  --disnote-font-size: 18px;
  --disnote-line-height: 1.8;
  --disnote-background: #fffaf3;
  --disnote-surface: #f4ece2;
  --disnote-text: #342b25;
  --disnote-text-muted: #786859;
  --disnote-border: #dfd0bf;
  --disnote-link: #7c3aed;
  --disnote-radius: 12px;
  --disnote-block-gap: 1em;
  --disnote-card-padding: 16px;
  --disnote-editor-padding: 24px;
}

/* Semantic document elements remain normal CSS targets. */
.brand-notes.disnote-document h1 { letter-spacing: 0.02em; }
.brand-notes.disnote-document p { margin-block: 1.2em; }
```

No vendor selectors or `!important` are needed for these changes. Variables can
also be declared on an application ancestor and inherited by each document.
Keep the default editor portal inside its container to preserve the same scope.

For dynamic values/CSS-in-JS, use the typed `style` prop:

```tsx
import type { DisNoteStyle } from '@disnote/react';

const style: DisNoteStyle = {
  '--disnote-font-size': '20px',
  '--disnote-text': accentColor,
  border: '1px solid currentColor',
};
<DocumentEditor style={style} onChange={setDocument} />
<DocumentView style={style} document={document} />
```

Use CSS length units for length tokens. `DISNOTE_CSS_VARIABLES` provides typed
token names. Inline instance variables take precedence over CSS classes;
`DocumentRenderer.theme` maps its colors to variables, and explicit `style`
variables override that legacy theme object. Defaults remain CSS fallbacks,
so custom classes are not overwritten by default inline color/background styles.
An explicitly supplied legacy `theme` also applies root color/background inline
so existing themed renderers work without adding the optional stylesheet.

## Token and DOM contract

| Tokens | Purpose |
|---|---|
| `--disnote-background`, `--disnote-surface` | Document/editor and card/menu backgrounds |
| `--disnote-text`, `--disnote-text-muted`, `--disnote-link` | Default text, secondary text and links |
| `--disnote-border`, `--disnote-focus`, `--disnote-selection`, `--disnote-danger` | Borders, focus, selected text and error text |
| `--disnote-font-family`, `--disnote-font-size`, `--disnote-line-height` | Typography |
| `--disnote-radius`, `--disnote-block-gap`, `--disnote-card-padding` | Shared corners and common block/card spacing |
| `--disnote-editor-padding`, `--disnote-caption-size` | Editor content inset and renderer caption scale |

Stable hooks: `.disnote-editor`, `.disnote-editor__surface`,
`.disnote-editor__content`, `.disnote-document`,
`[data-disnote-surface="editor"]`, `[data-disnote-surface="renderer"]`,
`[data-disnote-slot="content"]`, and `[data-disnote-theme="dark"]`.
Adding `className` preserves the base class. Editor `theme="dark"` and view
`appearance="dark"` select the optional stylesheet's dark tokens. Document-authored
inline color marks retain their meaning; theme changes do not rewrite JSON.
Media sizing and structural layout still follow document content. Tokens are a
supported customization surface, not a promise that every vendor-internal node
or third-party popup DOM is stable. Rich workspace panels can inherit variables
inside a DisNote surface; their host layout remains the application's choice.

## Local packed development

Before publication, build this repository and pack both workspaces:

```sh
npm run build
npm pack --workspace @disnote/core --pack-destination ../DisNote-Document-Demo/vendor
npm pack --workspace @disnote/react --pack-destination ../DisNote-Document-Demo/vendor
```

Install both generated files in the consumer in one command. Local dependency
files substitute for registry releases; run Changesets before publishing so the
convenience package points at the new core release. The standalone demo exposes
`#styling` for live CSS controls and `#styling-readonly` for a reader-only check.

Implementation and fresh evidence: `INTEGRATION_STYLING_ACCEPTANCE.md`.
