import { useMemo, type ReactNode } from "react";
import { renderMathToMarkup } from "../../math/index.js";

export interface MathRendererProps {
  code: string;
  displayMode?: boolean;
  className?: string;
  fallback?: ReactNode;
}

/** Render LaTeX as semantic MathML without requiring a stylesheet. */
export function MathRenderer({
  code,
  displayMode = true,
  className = "disnote-math",
  fallback,
}: MathRendererProps): ReactNode {
  const result = useMemo(
    () => renderMathToMarkup(code, { displayMode }),
    [code, displayMode]
  );

  if (!result.ok) {
    return (
      <span
        className={`${className} ${className}--invalid`}
        data-math-invalid="true"
        title={result.error}
      >
        {fallback ?? code}
      </span>
    );
  }

  return (
    <span
      className={className}
      data-latex={code}
      dangerouslySetInnerHTML={{ __html: result.markup }}
    />
  );
}
