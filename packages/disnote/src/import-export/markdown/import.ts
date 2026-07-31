import { LIBRARY_MESSAGES } from "../../core/messages.js";
import type {
  DisNoteBlock,
  DisNoteInline,
  TextMark,
} from "../../core/index.js";
import {
  createDocument,
  paragraph,
  heading,
  bulletListItem,
  numberedListItem,
  checklistItem,
  quote,
  codeBlock,
  mathEquation,
  divider,
  safeUrl,
} from "../../core/index.js";
import { WarningSink, type ImportResult } from "../warnings.js";

/** Parse inline Markdown (bold, italic, code, links) into DisNote inline nodes. */
export function parseInline(text: string, w: WarningSink): DisNoteInline[] {
  const nodes: DisNoteInline[] = [];
  let i = 0;
  let plain = "";

  const flush = (marks?: TextMark[]): void => {
    if (plain.length > 0) {
      nodes.push(
        marks && marks.length
          ? { type: "text", text: plain, marks }
          : { type: "text", text: plain }
      );
      plain = "";
    }
  };

  while (i < text.length) {
    const rest = text.slice(i);

    const link = /^\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
    if (link) {
      flush();
      const href = link[2]!;
      if (
        safeUrl(href, {
          allowedSchemes: ["https:", "http:", "mailto:", "tel:"],
          allowRelative: true,
        }) === null
      ) {
        w.add("unsafe-url", LIBRARY_MESSAGES.unsafeLinkDropped(href));
        nodes.push({ type: "text", text: link[1]! });
      } else {
        nodes.push({
          type: "link",
          href,
          content: [{ type: "text", text: link[1]! }],
        });
      }
      i += link[0].length;
      continue;
    }
    const bold = /^\*\*([^*]+)\*\*/.exec(rest);
    if (bold) {
      flush();
      nodes.push({ type: "text", text: bold[1]!, marks: [{ type: "bold" }] });
      i += bold[0].length;
      continue;
    }
    const italic = /^\*([^*]+)\*/.exec(rest);
    if (italic) {
      flush();
      nodes.push({
        type: "text",
        text: italic[1]!,
        marks: [{ type: "italic" }],
      });
      i += italic[0].length;
      continue;
    }
    const strike = /^~~([^~]+)~~/.exec(rest);
    if (strike) {
      flush();
      nodes.push({
        type: "text",
        text: strike[1]!,
        marks: [{ type: "strike" }],
      });
      i += strike[0].length;
      continue;
    }
    const code = /^`([^`]+)`/.exec(rest);
    if (code) {
      flush();
      nodes.push({ type: "text", text: code[1]!, marks: [{ type: "code" }] });
      i += code[0].length;
      continue;
    }
    plain += text[i];
    i += 1;
  }
  flush();
  return nodes.length ? nodes : [{ type: "text", text: "" }];
}

/** Import Markdown into a DisNoteDocument (supported subset). */
export function importMarkdown(
  markdown: string,
  options: { now?: string } = {}
): ImportResult {
  const w = new WarningSink();
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: DisNoteBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }
    const singleLineMath = /^\$\$(.*)\$\$$/.exec(trimmed);
    if (singleLineMath) {
      blocks.push(mathEquation(singleLineMath[1]!.trim()));
      i++;
      continue;
    }
    if (trimmed === "$$") {
      const body: string[] = [];
      i++;
      while (i < lines.length && lines[i]!.trim() !== "$$") {
        body.push(lines[i]!);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push(mathEquation(body.join("\n").trim()));
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(divider());
      i++;
      continue;
    }
    const fence = /^```(\w*)$/.exec(trimmed);
    if (fence) {
      const lang = fence[1] || "text";
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i]!.trim())) {
        body.push(lines[i]!);
        i++;
      }
      i++; // closing fence
      blocks.push(codeBlock(body.join("\n"), lang));
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (h) {
      blocks.push(
        heading(h[1]!.length as 1 | 2 | 3, parseInline(h[2]!, w) as never)
      );
      i++;
      continue;
    }
    const check = /^[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(trimmed);
    if (check) {
      blocks.push(
        checklistItem(
          parseInline(check[2]!, w) as never,
          check[1]!.toLowerCase() === "x"
        )
      );
      i++;
      continue;
    }
    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      blocks.push(bulletListItem(parseInline(bullet[1]!, w) as never));
      i++;
      continue;
    }
    const numbered = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (numbered) {
      blocks.push(numberedListItem(parseInline(numbered[1]!, w) as never));
      i++;
      continue;
    }
    const bq = /^>\s?(.*)$/.exec(trimmed);
    if (bq) {
      blocks.push(quote(parseInline(bq[1]!, w) as never));
      i++;
      continue;
    }
    blocks.push(paragraph(parseInline(trimmed, w) as never));
    i++;
  }

  const document = createDocument(
    options.now ? { blocks, now: options.now } : { blocks }
  );
  return { document, warnings: w.list };
}
