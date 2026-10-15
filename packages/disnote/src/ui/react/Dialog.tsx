import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
const DIALOG_KEYS = { ESCAPE: "Escape", TAB: "Tab", FOCUSABLE: "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex='0'],[contenteditable='true']" } as const;
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }): ReactNode {
  const ref = useRef<HTMLDivElement>(null), close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const backdrop = ref.current?.parentElement;
    const siblings = [...document.body.children].filter((node): node is HTMLElement => node instanceof HTMLElement && node !== backdrop).map(node => ({ node, inert: node.inert }));
    for (const item of siblings) item.node.inert = true;
    ref.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === DIALOG_KEYS.ESCAPE) { event.preventDefault(); close.current(); }
      if (event.key !== DIALOG_KEYS.TAB || event.defaultPrevented) return;
      const items = [...(ref.current?.querySelectorAll<HTMLElement>(DIALOG_KEYS.FOCUSABLE) ?? [])].filter(item => item.getClientRects().length > 0);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); document.body.style.overflow = previousOverflow; for (const item of siblings) item.node.inert = item.inert; previous?.focus(); };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(<div onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key !== DIALOG_KEYS.ESCAPE && event.key !== DIALOG_KEYS.TAB) event.stopPropagation(); }} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.4)", padding: 16, display: "grid", placeItems: "center" }}><div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} style={{ background: "Canvas", color: "CanvasText", padding: 20, borderRadius: 8, width: "min(800px,100%)", maxHeight: "90vh", overflow: "auto", boxSizing: "border-box" }}>{children}</div></div>, document.body);
}
