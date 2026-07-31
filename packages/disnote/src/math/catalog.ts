export type MathPaletteCategory =
  | "structures"
  | "operators"
  | "relations"
  | "greek";

export interface MathPaletteItem {
  id: string;
  category: MathPaletteCategory;
  /** Compact visual label shown in the equation palette. */
  label: string;
  /** Accessible description used by title and aria-label. */
  description: string;
  /**
   * Text inserted when there is no selection. The `|` character marks the
   * caret position after insertion and is removed from the resulting LaTeX.
   */
  insert: string;
  /**
   * Optional wrapper used when text is selected. `{{selection}}` is replaced
   * by the selected text and `|` marks the next caret position.
   */
  wrapSelection?: string;
}

export interface MathInsertionResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface MathFieldTemplate {
  /**
   * LaTeX fragment understood by visual math fields. `#0` uses the current
   * selection (or creates an editable placeholder) and `#?` always creates a
   * new editable placeholder.
   */
  insert: string;
  /** Compact mathematical preview rendered on the palette button. */
  preview: string;
}

const structures: MathPaletteItem[] = [
  {
    id: "fraction",
    category: "structures",
    label: "a/b",
    description: "Fraction",
    insert: "\\frac{|}{}",
    wrapSelection: "\\frac{{{selection}}}{|}",
  },
  {
    id: "superscript",
    category: "structures",
    label: "x²",
    description: "Superscript",
    insert: "^{|}",
    wrapSelection: "^{{{selection}}}",
  },
  {
    id: "subscript",
    category: "structures",
    label: "x₂",
    description: "Subscript",
    insert: "_{|}",
    wrapSelection: "_{{{selection}}}",
  },
  {
    id: "square-root",
    category: "structures",
    label: "√x",
    description: "Square root",
    insert: "\\sqrt{|}",
    wrapSelection: "\\sqrt{{{selection}}}",
  },
  {
    id: "nth-root",
    category: "structures",
    label: "ⁿ√x",
    description: "Nth root",
    insert: "\\sqrt[|]{}",
    wrapSelection: "\\sqrt[|]{{{selection}}}",
  },
  {
    id: "parentheses",
    category: "structures",
    label: "(x)",
    description: "Scalable parentheses",
    insert: "\\left(|\\right)",
    wrapSelection: "\\left({{selection}}\\right)",
  },
  {
    id: "absolute",
    category: "structures",
    label: "|x|",
    description: "Absolute value",
    insert: "\\left||\\right|",
    wrapSelection: "\\left|{{selection}}\\right|",
  },
  {
    id: "binomial",
    category: "structures",
    label: "(n k)",
    description: "Binomial coefficient",
    insert: "\\binom{|}{}",
    wrapSelection: "\\binom{{{selection}}}{|}",
  },
  {
    id: "vector",
    category: "structures",
    label: "x⃗",
    description: "Vector",
    insert: "\\vec{|}",
    wrapSelection: "\\vec{{{selection}}}",
  },
  {
    id: "overline",
    category: "structures",
    label: "x̄",
    description: "Overline",
    insert: "\\overline{|}",
    wrapSelection: "\\overline{{{selection}}}",
  },
  {
    id: "matrix-2",
    category: "structures",
    label: "[2×2]",
    description: "2 by 2 matrix",
    insert: "\\begin{bmatrix}| &  \\\\  & \\end{bmatrix}",
  },
  {
    id: "cases",
    category: "structures",
    label: "{ f(x)",
    description: "Piecewise cases",
    insert: "\\begin{cases}| & \\text{if } \\\\  & \\text{otherwise}\\end{cases}",
  },
];

const operators: MathPaletteItem[] = [
  {
    id: "sum",
    category: "operators",
    label: "∑",
    description: "Summation with limits",
    insert: "\\sum_{|}^{}",
  },
  {
    id: "product",
    category: "operators",
    label: "∏",
    description: "Product with limits",
    insert: "\\prod_{|}^{}",
  },
  {
    id: "integral",
    category: "operators",
    label: "∫",
    description: "Integral with limits",
    insert: "\\int_{|}^{}",
  },
  {
    id: "double-integral",
    category: "operators",
    label: "∬",
    description: "Double integral",
    insert: "\\iint_{|}^{}",
  },
  {
    id: "limit",
    category: "operators",
    label: "lim",
    description: "Limit",
    insert: "\\lim_{|\\to }",
  },
  {
    id: "partial",
    category: "operators",
    label: "∂",
    description: "Partial derivative symbol",
    insert: "\\partial ",
  },
  {
    id: "nabla",
    category: "operators",
    label: "∇",
    description: "Nabla symbol",
    insert: "\\nabla ",
  },
  {
    id: "infinity",
    category: "operators",
    label: "∞",
    description: "Infinity",
    insert: "\\infty ",
  },
  {
    id: "plus-minus",
    category: "operators",
    label: "±",
    description: "Plus or minus",
    insert: "\\pm ",
  },
  {
    id: "times",
    category: "operators",
    label: "×",
    description: "Multiplication",
    insert: "\\times ",
  },
  {
    id: "divide",
    category: "operators",
    label: "÷",
    description: "Division",
    insert: "\\div ",
  },
  {
    id: "dot",
    category: "operators",
    label: "·",
    description: "Dot product",
    insert: "\\cdot ",
  },
];

const relations: MathPaletteItem[] = [
  { id: "not-equal", category: "relations", label: "≠", description: "Not equal", insert: "\\ne " },
  { id: "approximately", category: "relations", label: "≈", description: "Approximately equal", insert: "\\approx " },
  { id: "less-equal", category: "relations", label: "≤", description: "Less than or equal", insert: "\\leq " },
  { id: "greater-equal", category: "relations", label: "≥", description: "Greater than or equal", insert: "\\geq " },
  { id: "element", category: "relations", label: "∈", description: "Element of", insert: "\\in " },
  { id: "not-element", category: "relations", label: "∉", description: "Not an element of", insert: "\\notin " },
  { id: "subset", category: "relations", label: "⊂", description: "Subset", insert: "\\subset " },
  { id: "union", category: "relations", label: "∪", description: "Union", insert: "\\cup " },
  { id: "intersection", category: "relations", label: "∩", description: "Intersection", insert: "\\cap " },
  { id: "left-arrow", category: "relations", label: "←", description: "Left arrow", insert: "\\leftarrow " },
  { id: "right-arrow", category: "relations", label: "→", description: "Right arrow", insert: "\\rightarrow " },
  { id: "equivalent", category: "relations", label: "⇔", description: "Equivalent", insert: "\\Leftrightarrow " },
];

const greek: MathPaletteItem[] = [
  { id: "alpha", category: "greek", label: "α", description: "Alpha", insert: "\\alpha " },
  { id: "beta", category: "greek", label: "β", description: "Beta", insert: "\\beta " },
  { id: "gamma", category: "greek", label: "γ", description: "Gamma", insert: "\\gamma " },
  { id: "delta", category: "greek", label: "δ", description: "Delta", insert: "\\delta " },
  { id: "theta", category: "greek", label: "θ", description: "Theta", insert: "\\theta " },
  { id: "lambda", category: "greek", label: "λ", description: "Lambda", insert: "\\lambda " },
  { id: "mu", category: "greek", label: "μ", description: "Mu", insert: "\\mu " },
  { id: "pi", category: "greek", label: "π", description: "Pi", insert: "\\pi " },
  { id: "rho", category: "greek", label: "ρ", description: "Rho", insert: "\\rho " },
  { id: "sigma", category: "greek", label: "σ", description: "Sigma", insert: "\\sigma " },
  { id: "phi", category: "greek", label: "φ", description: "Phi", insert: "\\phi " },
  { id: "omega", category: "greek", label: "ω", description: "Omega", insert: "\\omega " },
];

export const mathPaletteItems: readonly MathPaletteItem[] = [
  ...structures,
  ...operators,
  ...relations,
  ...greek,
];

export const mathPaletteByCategory: Readonly<
  Record<MathPaletteCategory, readonly MathPaletteItem[]>
> = {
  structures,
  operators,
  relations,
  greek,
};

const visualTemplates: Readonly<Record<string, MathFieldTemplate>> = {
  fraction: {
    insert: "\\frac{#0}{#?}",
    preview: "\\frac{a}{b}",
  },
  superscript: {
    insert: "#@^{#?}",
    preview: "x^2",
  },
  subscript: {
    insert: "#@_{#?}",
    preview: "x_2",
  },
  "square-root": {
    insert: "\\sqrt{#0}",
    preview: "\\sqrt{x}",
  },
  "nth-root": {
    insert: "\\sqrt[#?]{#0}",
    preview: "\\sqrt[n]{x}",
  },
  parentheses: {
    insert: "\\left(#0\\right)",
    preview: "\\left(x\\right)",
  },
  absolute: {
    insert: "\\left|#0\\right|",
    preview: "\\left|x\\right|",
  },
  binomial: {
    insert: "\\binom{#0}{#?}",
    preview: "\\binom{n}{k}",
  },
  vector: {
    insert: "\\vec{#0}",
    preview: "\\vec{x}",
  },
  overline: {
    insert: "\\overline{#0}",
    preview: "\\overline{x}",
  },
  "matrix-2": {
    insert:
      "\\begin{bmatrix}#? & #? \\\\ #? & #?\\end{bmatrix}",
    preview: "\\begin{bmatrix}a & b \\\\ c & d\\end{bmatrix}",
  },
  cases: {
    insert:
      "\\begin{cases}#? & \\text{if } #? \\\\ #? & \\text{otherwise}\\end{cases}",
    preview: "\\begin{cases}x & x>0 \\\\ 0 & x\\leq 0\\end{cases}",
  },
  sum: {
    insert: "\\sum_{#?}^{#?}#0",
    preview: "\\sum_{i=1}^{n}",
  },
  product: {
    insert: "\\prod_{#?}^{#?}#0",
    preview: "\\prod_{i=1}^{n}",
  },
  integral: {
    insert: "\\int_{#?}^{#?}#0\\,\\mathrm{d}#?",
    preview: "\\int_a^b f(x)\\,\\mathrm{d}x",
  },
  "double-integral": {
    insert: "\\iint_{#?}#0\\,\\mathrm{d}#?",
    preview: "\\iint_D f\\,\\mathrm{d}A",
  },
  limit: {
    insert: "\\lim_{#?\\to #?}#0",
    preview: "\\lim_{x\\to 0}",
  },
};

/**
 * Return the visual insertion template for a palette item. Simple symbols use
 * their existing LaTeX insertion, while structures use editable placeholders.
 */
export function mathFieldTemplateFor(
  item: MathPaletteItem
): MathFieldTemplate {
  return (
    visualTemplates[item.id] ?? {
      insert: item.insert.trim(),
      preview: item.insert.trim(),
    }
  );
}

export function applyMathPaletteItem(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  item: MathPaletteItem
): MathInsertionResult {
  const safeStart = Math.max(0, Math.min(selectionStart, value.length));
  const safeEnd = Math.max(safeStart, Math.min(selectionEnd, value.length));
  const selection = value.slice(safeStart, safeEnd);
  let insertion =
    selection && item.wrapSelection ? item.wrapSelection : item.insert;
  insertion = insertion.replace("{{selection}}", selection);

  const markerIndex = insertion.indexOf("|");
  insertion = insertion.replace("|", "");
  const nextValue =
    value.slice(0, safeStart) + insertion + value.slice(safeEnd);
  const caret =
    safeStart + (markerIndex >= 0 ? markerIndex : insertion.length);

  return {
    value: nextValue,
    selectionStart: caret,
    selectionEnd: caret,
  };
}
