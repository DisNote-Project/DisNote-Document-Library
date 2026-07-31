import "mathlive/fonts.css";
import { MathfieldElement } from "mathlive";

/**
 * Load and configure MathLive only in a browser that actually renders a math
 * block. Keeping this module behind a dynamic import preserves SSR and avoids
 * adding the visual editor engine to documents that do not use equations.
 */
export async function prepareMathField(
  element: MathfieldElement,
  value: string,
  placeholder: string
): Promise<MathfieldElement> {
  await globalThis.customElements.whenDefined("math-field");

  MathfieldElement.soundsDirectory = null;
  element.value = value;
  element.placeholder = placeholder;
  element.mathVirtualKeyboardPolicy = "auto";
  element.smartFence = true;
  element.smartMode = false;
  element.menuItems = [];
  element.environmentPopoverPolicy = "auto";
  return element;
}
