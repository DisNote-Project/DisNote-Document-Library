import { Inflate, strFromU8 } from "fflate";
import { DIAGRAM_LIMITS } from "./model.js";

/** Local, bounded decoding. DTDs, executable codecs and network shapes are refused. */
export function readDrawioPages(source: string): { name: string; xml: string }[] {
  const parse = (xml: string) => {
    if (xml.length > DIAGRAM_LIMITS.XML || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error();
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error();
    return doc;
  };
  const outer = parse(source);
  const diagrams = outer.documentElement.tagName === "mxGraphModel" ? [outer.documentElement] : Array.from(outer.querySelectorAll("mxfile > diagram"));
  if (!diagrams.length || diagrams.length > 50) throw new Error();
  let decodedSize = 0;
  return diagrams.map((page, index) => {
    let model = page.tagName === "mxGraphModel" ? page : page.querySelector("mxGraphModel");
    if (!model) {
      const encoded = (page.textContent ?? "").trim();
      if (encoded.startsWith("<")) model = parse(encoded).documentElement;
      else {
        const input = Uint8Array.from(atob(encoded), ch => ch.charCodeAt(0));
        const chunks: Uint8Array[] = []; let size = 0;
        const inflate = new Inflate(chunk => { size += chunk.length; if (size > DIAGRAM_LIMITS.XML) throw new Error(); chunks.push(chunk); });
        for (let at = 0; at < input.length; at += 32) inflate.push(input.subarray(at, at + 32), at + 32 >= input.length);
        const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        model = parse(decodeURIComponent(strFromU8(bytes))).documentElement;
      }
    }
    if (model.tagName !== "mxGraphModel" || model.querySelectorAll("mxCell").length > DIAGRAM_LIMITS.CELLS) throw new Error();
    const allowed = new Set(["mxGraphModel", "root", "mxCell", "mxGeometry", "mxPoint", "Array", "Object"]);
    for (const node of [model, ...Array.from(model.querySelectorAll("*"))]) {
      if (!allowed.has(node.tagName)) throw new Error();
      for (const attribute of Array.from(node.attributes)) {
        if (["id", "parent", "source", "target"].includes(attribute.name) && /^(?:__proto__|constructor|prototype)$/.test(attribute.value)) throw new Error();
        if (/__proto__|constructor|prototype/i.test(attribute.name) || (attribute.name === "as" && !["geometry", "points", "offset", "sourcePoint", "targetPoint"].includes(attribute.value))) throw new Error();
        if (/^(on|href|src|link|image)/i.test(attribute.name) || /javascript:|https?:|data:|url\(/i.test(attribute.value)) throw new Error();
      }
      // mxGraph labels are plain text, never HTML markup.
      if (node.hasAttribute("value")) node.setAttribute("value", node.getAttribute("value")!.replace(/<[^>]*>/g, ""));
      if (/stencil\(|image=|javascript:|eval\(/i.test(node.getAttribute("style") ?? "")) throw new Error();
      if (node.hasAttribute("style")) node.setAttribute("style", node.getAttribute("style")!.replace(/html=1/g, "html=0"));
    }
    const xml = new XMLSerializer().serializeToString(model); decodedSize += xml.length;
    if (decodedSize > DIAGRAM_LIMITS.XML) throw new Error();
    return { name: page.getAttribute("name") ?? String(index + 1), xml };
  });
}
