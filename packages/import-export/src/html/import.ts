import type { DisNoteBlock, DisNoteInline, TextMark } from "@disnote/document-core";
import {
  createDocument,
  paragraph,
  heading,
  bulletListItem,
  numberedListItem,
  quote,
  codeBlock,
  divider,
} from "@disnote/document-core";
import { WarningSink, type ImportResult } from "../warnings.js";

const UNSAFE_SCHEME = /^\s*(javascript|vbscript|file|data):/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Parse a fragment of inline HTML into DisNote inline nodes (supported subset). */
export function parseInlineHtml(html: string, w: WarningSink): DisNoteInline[] {
  const nodes: DisNoteInline[] = [];
  const tokenRe = /<(\/?)(strong|b|em|i|u|s|del|code|a)( [^>]*)?>|([^<]+)/gi;
  const markStack: TextMark[] = [];
  let linkHref: string | null = null;
  let match: RegExpExecArray | null;

  const pushText = (text: string): void => {
    const decoded = decodeEntities(text);
    if (!decoded) return;
    const marks = [...markStack];
    if (linkHref !== null) {
      nodes.push({ type: "link", href: linkHref, content: [{ type: "text", text: decoded }] });
    } else {
      nodes.push(marks.length ? { type: "text", text: decoded, marks } : { type: "text", text: decoded });
    }
  };

  while ((match = tokenRe.exec(html)) !== null) {
    const [, closing, tag, attrs, textContent] = match;
    if (textContent !== undefined) {
      pushText(textContent);
      continue;
    }
    const name = tag!.toLowerCase();
    if (name === "a") {
      if (closing) {
        linkHref = null;
      } else {
        const href = / href="([^"]*)"/i.exec(attrs ?? "")?.[1] ?? "";
        if (UNSAFE_SCHEME.test(href)) {
          w.add("unsafe-url", `Dropped unsafe href "${href}"`);
          linkHref = null;
        } else {
          linkHref = href;
        }
      }
      continue;
    }
    const markType = htmlTagToMark(name);
    if (!markType) continue;
    if (closing) {
      const idx = markStack.findIndex((m) => m.type === markType);
      if (idx >= 0) markStack.splice(idx, 1);
    } else {
      markStack.push({ type: markType });
    }
  }
  return nodes.length ? nodes : [{ type: "text", text: "" }];
}

type SimpleMarkType = "bold" | "italic" | "underline" | "strike" | "code";

function htmlTagToMark(tag: string): SimpleMarkType | null {
  switch (tag) {
    case "strong":
    case "b":
      return "bold";
    case "em":
    case "i":
      return "italic";
    case "u":
      return "underline";
    case "s":
    case "del":
      return "strike";
    case "code":
      return "code";
    default:
      return null;
  }
}

/** Import a subset of HTML into a DisNoteDocument. Unsupported tags are skipped with a warning. */
export function importHtml(html: string, options: { now?: string } = {}): ImportResult {
  const w = new WarningSink();
  const blocks: DisNoteBlock[] = [];
  const blockRe =
    /<(h[1-3]|p|ul|ol|blockquote|pre|hr)\b[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>(?![\s\S]*<\/hr>)/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(html)) !== null) {
    const tag = (match[1] ?? "hr").toLowerCase();
    const inner = match[2] ?? "";
    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
        blocks.push(heading(Number(tag[1]) as 1 | 2 | 3, parseInlineHtml(inner, w) as never));
        break;
      case "p":
        blocks.push(paragraph(parseInlineHtml(inner, w) as never));
        break;
      case "blockquote":
        blocks.push(quote(parseInlineHtml(inner, w) as never));
        break;
      case "hr":
        blocks.push(divider());
        break;
      case "pre": {
        const codeInner = /<code[^>]*>([\s\S]*?)<\/code>/i.exec(inner)?.[1] ?? inner;
        const lang = /class="language-([^"]+)"/i.exec(inner)?.[1] ?? "text";
        blocks.push(codeBlock(decodeEntities(codeInner), lang));
        break;
      }
      case "ul":
      case "ol": {
        const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
        let li: RegExpExecArray | null;
        while ((li = liRe.exec(inner)) !== null) {
          const content = parseInlineHtml(li[1]!.replace(/<ul[\s\S]*<\/ul>|<ol[\s\S]*<\/ol>/gi, ""), w);
          blocks.push(tag === "ul" ? bulletListItem(content as never) : numberedListItem(content as never));
        }
        break;
      }
    }
  }

  if (blocks.length === 0) w.add("unsupported-html", "No supported block-level HTML was found");
  const document = createDocument(options.now ? { blocks, now: options.now } : { blocks });
  return { document, warnings: w.list };
}
