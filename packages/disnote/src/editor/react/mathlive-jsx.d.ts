import type {
  DetailedHTMLProps,
  HTMLAttributes,
} from "react";
import type { MathfieldElement } from "mathlive";

declare module "mathlive/fonts.css";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": DetailedHTMLProps<
        HTMLAttributes<MathfieldElement>,
        MathfieldElement
      >;
    }
  }
}
