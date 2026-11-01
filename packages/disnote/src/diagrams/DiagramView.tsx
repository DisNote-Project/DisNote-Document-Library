"use client";
import { useEffect, useRef, useState, useId } from "react";
import { uiMessages } from "../ui/messages.js";
import { DIAGRAM_FORMATS, validDiagramSource, type DiagramFormat } from "./model.js";

export interface DiagramViewProps { format: DiagramFormat; code: string; locale?: string }
export function DiagramView({ format, code, locale }: DiagramViewProps) {
  const root = useRef<HTMLDivElement>(null), id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [failed, setFailed] = useState(false), [loading, setLoading] = useState(true), [pages, setPages] = useState<string[]>([]), [page, setPage] = useState(0);
  const messages = uiMessages(locale);
  useEffect(() => { setPage(0); }, [code, format]);
  useEffect(() => {
    let active = true; let dispose: (() => void) | undefined;
    const host = root.current!; host.replaceChildren(); setFailed(false); setLoading(true);
    const render = async () => {
      if (!validDiagramSource(code) || !code.trim()) throw new Error();
      if (format === DIAGRAM_FORMATS.MERMAID) {
        if (/^---\s*$|%%\s*\{/m.test(code)) throw new Error();
        const [{ default: mermaid }, { default: purify }] = await Promise.all([import("mermaid"), import("dompurify")]);
        if (!active) return;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true, htmlLabels: false, maxTextSize: 200000, maxEdges: 500, flowchart: { htmlLabels: false } });
        const result = await mermaid.render(`disnote${id}`, code);
        if (!active) return;
        host.innerHTML = purify.sanitize(result.svg, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ["foreignObject", "a", "image", "script", "style"], FORBID_ATTR: ["href", "xlink:href", "style"] });
        setPages([]);
      } else {
        const [{ readDrawioPages }, { Graph, ModelXmlSerializer, registerAllCodecs, ObjectCodec, StylesheetCodec }] = await Promise.all([import("./drawio.js"), import("@maxgraph/core")]);
        if (!active) return;
        const diagrams = readDrawioPages(code); setPages(diagrams.map(item => item.name));
        ObjectCodec.allowEval = false; StylesheetCodec.allowEval = false; registerAllCodecs();
        const graph = new Graph(host); dispose = () => graph.destroy();
        graph.setEnabled(false); graph.setHtmlLabels(false);
        new ModelXmlSerializer(graph.getDataModel()).import(diagrams[Math.min(page, diagrams.length - 1)]!.xml);
        const bounds = graph.getGraphBounds();
        const fit = () => { graph.zoomTo(Math.min(1, Math.max(0.05, (host.clientWidth - 48) / Math.max(1, bounds.width)), 272 / Math.max(1, bounds.height))); graph.center(); };
        fit(); const observer = new ResizeObserver(fit); observer.observe(host);
        dispose = () => { observer.disconnect(); graph.destroy(); };
      }
      if (active) setLoading(false);
    };
    const timer = setTimeout(() => { void render().catch(() => { if (active) { host.replaceChildren(); setFailed(true); setLoading(false); } }); }, 250);
    return () => { active = false; clearTimeout(timer); dispose?.(); host.replaceChildren(); };
  }, [code, format, page, id]);
  return <div className="disnote-diagram" data-diagram-format={format}>
    {pages.length > 1 && <select aria-label={messages.pages} value={page} onChange={event => setPage(Number(event.target.value))}>{pages.map((name, index) => <option key={index} value={index}>{name}</option>)}</select>}
    {loading && <p role="status">{messages.loading}</p>}
    {failed && <p role="alert">{messages.diagramInvalid}</p>}
    <div ref={root} className="disnote-diagram__canvas" role="img" aria-label={messages[format]} style={{ position: "relative", overflow: "auto", minHeight: 120, height: format === DIAGRAM_FORMATS.DRAWIO ? 320 : undefined }} />
    {failed && <pre>{code}</pre>}
  </div>;
}
