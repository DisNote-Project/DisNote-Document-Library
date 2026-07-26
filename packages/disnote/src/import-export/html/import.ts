import type { DisNoteBlock, DisNoteInline, TextMark } from "../../core/index.js";
import {
  createDocument,
  paragraph,
  heading,
  bulletListItem,
  numberedListItem,
  checklistItem,
  quote,
  codeBlock,
  divider,
  customBlock,
} from "../../core/index.js";
import { WarningSink, type ImportResult } from "../warnings.js";

const UNSAFE_SCHEME = /^\s*(javascript|vbscript|file|data):/i;

function decodeEntities(s: string): string {
  const decodeCodePoint = (value: string, radix: number): string => {
    const codePoint = Number.parseInt(value, radix);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : "\ufffd";
  };

  return s
    .replace(/&#(\d+);/g, (_, value: string) => decodeCodePoint(value, 10))
    .replace(/&#x([\da-f]+);/gi, (_, value: string) => decodeCodePoint(value, 16))
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Parse a fragment of inline HTML into DisNote inline nodes (supported subset). */
export function parseInlineHtml(html: string, w: WarningSink): DisNoteInline[] {
  const nodes: DisNoteInline[] = [];
  const tokenRe = /<(\/?)(strong|b|em|i|u|s|del|code|a|br)\b([^>]*)>|([^<]+)/gi;
  const markStack: TextMark[] = [];
  let linkHref: string | null = null;
  let match: RegExpExecArray | null;

  const pushText = (text: string): void => {
    const decoded = decodeEntities(text);
    if (!decoded) return;
    const marks = [...markStack];
    if (linkHref !== null) {
      nodes.push({
        type: "link",
        href: linkHref,
        content: [marks.length ? { type: "text", text: decoded, marks } : { type: "text", text: decoded }],
      });
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
    if (name === "br") {
      pushText("\n");
      continue;
    }
    if (name === "a") {
      if (closing) {
        linkHref = null;
      } else {
        const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs ?? "");
        const href = decodeEntities(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "");
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

interface HtmlNode {
  type: "element" | "text";
  name: string;
  attrs: string;
  text?: string;
  children: HtmlNode[];
}

function parseHtmlToTree(html: string): HtmlNode[] {
  const root: HtmlNode = { type: "element", name: "root", attrs: "", children: [] };
  const stack: HtmlNode[] = [root];
  const source = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!doctype[^>]*>/gi, "");
  const voidElements = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);

  const tokenRe = /<(\/?)([a-zA-Z0-9-]+)([^>]*?)(\/?)>|([^<]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(source)) !== null) {
    const [, closing, tagName, attrs, selfClosing, textContent] = match;

    if (textContent !== undefined) {
      stack[stack.length - 1].children.push({
        type: "text",
        name: "",
        attrs: "",
        text: textContent,
        children: []
      });
      continue;
    }

    const name = tagName!.toLowerCase();
    const isSelfClosing = selfClosing === "/" || voidElements.has(name);

    if (closing) {
      const idx = stack.map(n => n.name).lastIndexOf(name);
      if (idx > 0) {
        stack.splice(idx);
      }
    } else {
      const node: HtmlNode = {
        type: "element",
        name,
        attrs: attrs ?? "",
        children: []
      };
      stack[stack.length - 1].children.push(node);
      if (!isSelfClosing) {
        stack.push(node);
      }
    }
  }

  return root.children;
}

function serializeHtml(nodes: HtmlNode[]): string {
  let result = "";
  for (const node of nodes) {
    if (node.type === "text") {
      result += node.text;
    } else {
      result += `<${node.name}${node.attrs}>`;
      result += serializeHtml(node.children);
      result += `</${node.name}>`;
    }
  }
  return result;
}

const BLOCK_ELEMENT_NAMES = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "div",
  "dl",
  "fieldset",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "ul",
]);

function containsBlockElement(nodes: HtmlNode[]): boolean {
  return nodes.some((node) => node.type === "element" && BLOCK_ELEMENT_NAMES.has(node.name));
}

function listItemToBlock(node: HtmlNode, ordered: boolean, w: WarningSink): DisNoteBlock {
  const inlineNodes: HtmlNode[] = [];
  const nestedLists: HtmlNode[] = [];
  let checkbox: HtmlNode | undefined;

  for (const child of node.children) {
    if (child.name === "ul" || child.name === "ol") {
      nestedLists.push(child);
    } else if (child.name === "input" && /\btype\s*=\s*(?:"checkbox"|'checkbox'|checkbox)/i.test(child.attrs)) {
      checkbox = child;
    } else {
      inlineNodes.push(child);
    }
  }

  const content = parseInlineHtml(serializeHtml(inlineNodes).trim(), w);
  const children = convertHtmlNodesToBlocks(nestedLists, w);
  if (checkbox) {
    const block = checklistItem(content as never, /\bchecked(?:\s|=|$)/i.test(checkbox.attrs));
    if (children.length > 0) block.children = children;
    return block;
  }
  return ordered
    ? numberedListItem(content as never, children)
    : bulletListItem(content as never, children);
}

function convertHtmlNodesToBlocks(nodes: HtmlNode[], w: WarningSink): DisNoteBlock[] {
  const blocks: DisNoteBlock[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      if (node.text?.trim() === "") continue;
      blocks.push(paragraph(parseInlineHtml(node.text!, w) as never));
      continue;
    }

    const name = node.name;
    switch (name) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        blocks.push(
          heading(
            Math.min(Number(name[1]), 3) as 1 | 2 | 3,
            parseInlineHtml(serializeHtml(node.children), w) as never,
          ),
        );
        break;
      case "p":
        blocks.push(paragraph(parseInlineHtml(serializeHtml(node.children), w) as never));
        break;
      case "div":
        if (containsBlockElement(node.children)) {
          blocks.push(...convertHtmlNodesToBlocks(node.children, w));
        } else {
          blocks.push(paragraph(parseInlineHtml(serializeHtml(node.children), w) as never));
        }
        break;
      case "blockquote":
        if (containsBlockElement(node.children)) {
          const nested = convertHtmlNodesToBlocks(node.children, w);
          for (const block of nested) {
            blocks.push(block.type === "paragraph" ? quote(block.content as never) : block);
          }
        } else {
          blocks.push(quote(parseInlineHtml(serializeHtml(node.children), w) as never));
        }
        break;
      case "hr":
        blocks.push(divider());
        break;
      case "table": {
        const rows: Array<{ cells: DisNoteInline[][] }> = [];
        const findTrNodes = (elList: HtmlNode[]): HtmlNode[] => {
          const result: HtmlNode[] = [];
          for (const el of elList) {
            if (el.name === "tr") {
              result.push(el);
            } else if (el.children) {
              result.push(...findTrNodes(el.children));
            }
          }
          return result;
        };
        const trNodes = findTrNodes(node.children);
        for (const tr of trNodes) {
          const cellNodes = tr.children.filter(c => c.name === "td" || c.name === "th");
          const cells = cellNodes.map(cell => parseInlineHtml(serializeHtml(cell.children), w));
          if (cells.length > 0) {
            rows.push({ cells });
          }
        }
        if (rows.length > 0) {
          blocks.push(customBlock("table", 1, {
            props: { rows, textColor: "default" } as unknown as DisNoteBlock["props"],
          }));
        }
        break;
      }
      case "pre": {
        const codeElement = node.children.find(c => c.name === "code");
        const codeInner = codeElement ? serializeHtml(codeElement.children) : serializeHtml(node.children);
        const langAttr = codeElement ? codeElement.attrs : node.attrs;
        const lang = /class="language-([^"]+)"/i.exec(langAttr)?.[1] ?? "text";
        blocks.push(codeBlock(decodeEntities(codeInner), lang));
        break;
      }
      case "ul":
      case "ol": {
        for (const child of node.children) {
          if (child.name !== "li") continue;
          blocks.push(listItemToBlock(child, name === "ol", w));
        }
        break;
      }
      case "html":
      case "body":
      case "main":
      case "article":
      case "section":
      case "header":
      case "footer":
      case "nav":
        blocks.push(...convertHtmlNodesToBlocks(node.children, w));
        break;
      case "script":
      case "style":
      case "noscript":
      case "template":
      case "head":
      case "meta":
      case "link":
        break;
      default:
        if (node.children && node.children.length > 0) {
          blocks.push(...convertHtmlNodesToBlocks(node.children, w));
        }
        break;
    }
  }

  return blocks;
}

/** Import a subset of HTML into a DisNoteDocument. Unsupported tags are skipped with a warning. */
export function importHtml(html: string, options: { now?: string } = {}): ImportResult {
  const w = new WarningSink();
  const parsedTree = parseHtmlToTree(html);
  const blocks = convertHtmlNodesToBlocks(parsedTree, w);

  if (blocks.length === 0) w.add("unsupported-html", "No supported block-level HTML was found");
  const document = createDocument(options.now ? { blocks, now: options.now } : { blocks });
  return { document, warnings: w.list };
}
