import { useRef, type ReactNode } from "react";
import { uiMessages } from "../../ui/messages.js";
/** Browser print produces a PDF through the system dialog, preserving vector text. */
export function PrintDocument({ children, locale = "en", title = "", print }: { children: ReactNode; locale?: string; title?: string; print?: (element: HTMLElement, title: string) => void }): ReactNode {
  const ref = useRef<HTMLDivElement>(null), messages = uiMessages(locale);
  const onPrint = () => {
    if (!ref.current) return;
    if (print) { print(ref.current, title); return; }
    const frame = document.createElement("iframe"); frame.style.position = "fixed"; frame.style.width = "1px"; frame.style.height = "1px"; frame.style.opacity = "0";
    document.body.appendChild(frame);
    const target = frame.contentDocument, view = frame.contentWindow;
    if (!target || !view) { frame.remove(); return; }
    target.title = title;
    const style = target.createElement("style"); style.textContent = "@page{margin:20mm}body{font:12pt system-ui}img,video,table{max-width:100%}pre{white-space:pre-wrap}article,h1,h2,h3{break-inside:avoid}"; target.head.appendChild(style);
    target.body.appendChild(ref.current.cloneNode(true));
    for (const image of target.images) image.loading = "eager";
    const cleanup = () => frame.remove(); view.addEventListener("afterprint", cleanup, { once: true });
    // Wait for document fonts/images before entering the print dialog.
    void Promise.all([target.fonts.ready, ...Array.from(target.images).map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => { img.onload = img.onerror = () => resolve(); }))]).then(() => { view.focus(); view.print(); });
  };
  return <section><button type="button" onClick={onPrint}>{messages.print}</button><div ref={ref}>{children}</div></section>;
}
