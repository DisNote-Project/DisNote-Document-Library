import katex from "katex";

export const MAX_MATH_CODE_LENGTH = 20_000;

export interface MathRenderResult {
  ok: boolean;
  markup: string;
  error?: string;
}

export interface RenderMathOptions {
  displayMode?: boolean;
  throwOnError?: boolean;
}

/**
 * Convert a LaTeX expression to semantic MathML. MathML keeps the renderer
 * lightweight because consumers do not have to load KaTeX's visual CSS.
 */
export function renderMathToMarkup(
  code: string,
  options: RenderMathOptions = {}
): MathRenderResult {
  if (code.length > MAX_MATH_CODE_LENGTH) {
    const error = `Math expression exceeds ${MAX_MATH_CODE_LENGTH} characters`;
    if (options.throwOnError) throw new Error(error);
    return { ok: false, markup: "", error };
  }

  try {
    const markup = katex.renderToString(code, {
      displayMode: options.displayMode ?? true,
      output: "mathml",
      throwOnError: true,
      strict: false,
      trust: false,
      maxExpand: 1_000,
    });
    return { ok: true, markup };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause);
    if (options.throwOnError) throw cause;
    return { ok: false, markup: "", error };
  }
}

export function isValidMathExpression(code: string): boolean {
  return renderMathToMarkup(code).ok;
}
