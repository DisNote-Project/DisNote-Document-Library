# Word-like equation editor

DisNote stores equations as compact, editor-independent V1 blocks:

```json
{
  "id": "blk_math",
  "type": "math",
  "version": 1,
  "props": {
    "code": "\\frac{x^2}{y_1}"
  }
}
```

The editor turns the internal source into a visual input surface similar to
Microsoft Word or a Casio calculator. Writers never need to see or edit raw
LaTeX. Existing documents that already use `props.code` remain compatible and
do not require a migration.

## Use it in the editor

Type `/math` and select **Math equation**. The palette contains four groups:

- **Structures**: fractions, superscripts, subscripts, roots, scalable
  parentheses, absolute values, binomial coefficients, vectors, overlines,
  matrices and piecewise cases.
- **Operators**: sums, products, integrals, limits, partial derivatives,
  infinity, plus/minus, multiplication and division.
- **Relations**: comparisons, set operators and arrows.
- **Greek**: commonly used Greek letters.

Each structure creates visible editable slots. Click a slot and type, then use
Tab or the arrow keys to move between slots. When content is selected, supported
structures wrap the selection.

The visual equation itself is the input field. There is no raw-LaTeX textarea.
Incomplete expressions are preserved while the writer finishes them, and the
read-only renderers only output markup produced by the safe parser.

## Create equations in code

```ts
import { createDocument, mathEquation } from "@disnote/core";

const document = createDocument({
  blocks: [
    mathEquation("\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}"),
  ],
});
```

## Render equations

`DocumentRenderer` and `renderDocumentToHtml` convert valid expressions to
semantic MathML. Consumers do not need to load the KaTeX stylesheet. The HTML
renderer returns an `invalid-math` warning when parsing fails.

React Native currently displays the source in a monospace fallback with an
accessible label. Native applications can provide a platform-specific equation
component through `blockRenderers.math`.

## Use the palette outside DisNoteEditor

```ts
import {
  applyMathPaletteItem,
  mathPaletteItems,
  renderMathToMarkup,
} from "@disnote/core/math";

const superscript = mathPaletteItems.find(
  (item) => item.id === "superscript",
)!;

const next = applyMathPaletteItem("x", 1, 1, superscript);
// next.value === "x^{}"
// Place the caret at next.selectionStart.

const rendered = renderMathToMarkup("\\frac{x}{y}");
```

For custom React interfaces:

- `MathEquationEditor` is exported from `@disnote/core/editor/react`.
- `MathRenderer` is exported from `@disnote/core/renderer/react`.

## Markdown and HTML

Equation blocks round-trip through display-math Markdown:

```md
$$
\frac{x^2}{y_1}
$$
```

Rendered HTML keeps the original expression in `data-latex`. Clipboard and
import flows can therefore recover the source while readers receive MathML.

## V1 limitation

V1 supports block equations. Inline equations inside a paragraph are not part
of the V1 inline model. Keeping this boundary preserves format compatibility
and leaves room for a versioned inline-math node in a later release.
