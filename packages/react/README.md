# DisNote React

Ready-to-use editor dependencies for React applications. This is currently an
unreleased workspace package: consume the packed build locally until a release
publishes it together with the matching `@disnote/core` version.

```sh
npm install @disnote/react
```

```tsx
import { DocumentEditor } from '@disnote/react';
import '@disnote/react/styles.css';

export function Notes() {
  return <DocumentEditor onChange={document => console.log(document)} />;
}
```

React and React DOM remain peers supplied by the application. Compatible editor,
multicolumn and Yjs runtimes are installed by this package. No application-wide
provider, registry, backend or initial document is required for basic editing.
Persistence belongs to your application's `onChange`/save flow; the editor does
not silently send documents to a server. Replace documents by changing the
component key. Use `initialDocument` to load existing DisNote JSON.

```tsx
<DocumentEditor
  className="brand-editor"
  style={{ '--disnote-font-family': 'Georgia, serif', '--disnote-font-size': '18px' }}
/>
```

```css
.brand-editor {
  --disnote-background: #fffaf3;
  --disnote-text: #342b25;
  --disnote-editor-padding: 20px;
  --disnote-radius: 12px;
}
```

`DocumentView` uses the same tokens. Dedicated read-only applications can install
`@disnote/core` plus React and import `@disnote/core/react/view`, without installing
editor peers. Importing this convenience package deliberately installs editor
dependencies. Its view subpath avoids loading the editor runtime in the browser.
The default CSS is scoped to DisNote classes; semantic content color marks remain
part of the document. Floating UI needs the same theme scope; the default editor
portal stays in its own container.

Full contract: repository `docs/REACT_INTEGRATION_AND_CSS.md`.
