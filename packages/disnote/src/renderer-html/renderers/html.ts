import { LIBRARY_MESSAGES } from "../../core/messages.js";
import type {
  DisNoteBlock,
  DisNoteDocument,
  DisNoteInline,
  TextInline,
  BlockRegistry,
} from "../../core/index.js";
import { extractDocumentPlainText, extractHeadings } from "../../core/index.js";
import { escapeHtml } from "../sanitization/escape.js";
import { safeHref, safeColor, type LinkPolicy } from "../sanitization/url.js";

export interface HtmlRenderPolicy {
  link?: LinkPolicy;
  /** Resolve an image assetId to a URL. */
  resolveAssetUrl?: (assetId: string) => string | undefined;
  /** Per-type renderers can override built-ins or render consumer blocks. */
  blockRenderers?: Readonly<Record<string, HtmlBlockRenderer>>;
}

export interface HtmlBlockRendererApi {
  block: DisNoteBlock;
  renderInline(content: DisNoteInline[] | undefined): string;
  renderChildren(blocks: DisNoteBlock[] | undefined): string;
  escape(value: string): string;
}

export interface HtmlBlockRenderer {
  (api: HtmlBlockRendererApi): string;
}

export interface AssetReference {
  assetId: string;
  alt: string;
}

export interface RenderWarning {
  blockId: string;
  code: "unknown-block" | "unsupported-version" | "unsafe-url";
  message: string;
}

export interface HeadingEntry {
  level: number;
  text: string;
  blockId: string;
}

export interface HtmlRenderResult {
  html: string;
  plainText: string;
  headings: HeadingEntry[];
  assets: AssetReference[];
  warnings: RenderWarning[];
}

export interface RenderDocumentToHtmlInput {
  document: DisNoteDocument;
  registry: BlockRegistry;
  policy?: HtmlRenderPolicy;
}

const LIST_TYPES = new Set(["bulletListItem", "numberedListItem"]);

export function renderDocumentToHtml(
  input: RenderDocumentToHtmlInput
): HtmlRenderResult {
  const ctx = new RenderContext(
    input.document,
    input.registry,
    input.policy ?? {}
  );
  const html = ctx.renderBlocks(input.document.blocks);
  return {
    html,
    plainText: extractDocumentPlainText(input.document, input.registry),
    headings: extractHeadings(input.document),
    assets: ctx.assets,
    warnings: ctx.warnings,
  };
}

class RenderContext {
  readonly warnings: RenderWarning[] = [];
  readonly assets: AssetReference[] = [];

  constructor(
    private readonly document: DisNoteDocument,
    private readonly registry: BlockRegistry,
    private readonly policy: HtmlRenderPolicy
  ) {}

  renderBlocks(blocks: DisNoteBlock[]): string {
    let out = "";
    let i = 0;
    while (i < blocks.length) {
      const block = blocks[i]!;
      const definition = this.registry.get(block.type);
      if (
        LIST_TYPES.has(block.type) &&
        !this.policy.blockRenderers?.[block.type] &&
        definition !== undefined &&
        block.version <= definition.version
      ) {
        const tag = block.type === "bulletListItem" ? "ul" : "ol";
        const group: DisNoteBlock[] = [];
        while (i < blocks.length && blocks[i]!.type === block.type) {
          group.push(blocks[i]!);
          i++;
        }
        out += `<${tag}>${group
          .map((b) => this.renderListItem(b))
          .join("")}</${tag}>`;
        continue;
      }
      out += this.renderBlock(block);
      i++;
    }
    return out;
  }

  private renderListItem(block: DisNoteBlock): string {
    const inner = this.renderInline(block.content);
    const children =
      block.children && block.children.length > 0
        ? this.renderBlocks(block.children)
        : "";
    return `<li>${inner}${children}</li>`;
  }

  private renderBlock(block: DisNoteBlock): string {
    const customRenderer = this.policy.blockRenderers?.[block.type];
    if (customRenderer) {
      return customRenderer({
        block,
        renderInline: (content) => this.renderInline(content),
        renderChildren: (blocks) => (blocks ? this.renderBlocks(blocks) : ""),
        escape: escapeHtml,
      });
    }
    const definition = this.registry.get(block.type);
    if (!definition) return this.renderUnknown(block, "unknown-block");
    if (block.version > definition.version) {
      return this.renderUnknown(block, "unsupported-version");
    }

    switch (block.type) {
      case "paragraph":
        return `<p>${this.renderInline(block.content)}</p>`;
      case "heading": {
        const level = clampLevel(block.props["level"]);
        return `<h${level} id="${escapeHtml(block.id)}">${this.renderInline(
          block.content
        )}</h${level}>`;
      }
      case "quote":
        return `<blockquote>${this.renderInline(block.content)}</blockquote>`;
      case "checklistItem": {
        const checked = block.props["checked"] === true ? " checked" : "";
        return `<div class="disnote-check"><input type="checkbox" disabled${checked}/> <span>${this.renderInline(
          block.content
        )}</span></div>`;
      }
      case "codeBlock": {
        const code =
          typeof block.props["code"] === "string"
            ? (block.props["code"] as string)
            : "";
        const lang =
          typeof block.props["language"] === "string"
            ? (block.props["language"] as string)
            : "text";
        return `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(
          code
        )}</code></pre>`;
      }
      case "toggle": {
        const children = block.children
          ? this.renderBlocks(block.children)
          : "";
        return `<details class="disnote-toggle" open><summary>${this.renderInline(
          block.content
        )}</summary>${children}</details>`;
      }
      case "divider":
        return "<hr/>";
      case "callout": {
        const intent =
          typeof block.props["intent"] === "string"
            ? (block.props["intent"] as string)
            : "info";
        const body =
          this.renderInline(block.content) +
          (block.children ? this.renderBlocks(block.children) : "");
        return `<aside class="disnote-callout" data-intent="${escapeHtml(
          intent
        )}">${body}</aside>`;
      }
      case "image": {
        const assetId =
          typeof block.props["assetId"] === "string"
            ? (block.props["assetId"] as string)
            : "";
        const alt =
          typeof block.props["alt"] === "string"
            ? (block.props["alt"] as string)
            : "";
        this.assets.push({ assetId, alt });
        const url = this.policy.resolveAssetUrl?.(assetId);
        const src = url ? this.safeBlockUrl(block, url) : null;
        if (!src)
          return `<figure data-asset="${escapeHtml(
            assetId
          )}"><figcaption>${escapeHtml(alt)}</figcaption></figure>`;
        return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(
          alt
        )}" loading="lazy"/></figure>`;
      }
      case "table": {
        const rows =
          (block.props["rows"] as unknown as Array<{
            cells?: DisNoteInline[][];
          }>) || [];
        const body = rows
          .map((row) => {
            const cells = (row.cells || [])
              .map((cell) => `<td>${this.renderInline(cell)}</td>`)
              .join("");
            return `<tr>${cells}</tr>`;
          })
          .join("");
        return `<div class="disnote-table"><table><tbody>${body}</tbody></table></div>`;
      }
      case "math": {
        const code =
          typeof block.props["code"] === "string" ? block.props["code"] : "";
        return `<div class="disnote-math">$$${escapeHtml(code)}$$</div>`;
      }
      case "bookmark": {
        const url =
          typeof block.props["url"] === "string" ? block.props["url"] : "";
        const title =
          typeof block.props["title"] === "string"
            ? block.props["title"]
            : "Web Link";
        const href = this.safeBlockUrl(block, url);
        return href
          ? `<div class="disnote-bookmark"><a href="${escapeHtml(
              href
            )}" rel="noopener noreferrer">${escapeHtml(title)}</a></div>`
          : `<div class="disnote-bookmark">${escapeHtml(title)}</div>`;
      }
      case "tableOfContents": {
        const items = extractHeadings(this.document)
          .map(
            (heading) =>
              `<li data-level="${heading.level}"><a href="#${escapeHtml(
                encodeURIComponent(heading.blockId)
              )}">${escapeHtml(heading.text || "Untitled heading")}</a></li>`
          )
          .join("");
        return `<nav class="disnote-toc" aria-label="Table of contents"><ol>${items}</ol></nav>`;
      }
      case "breadcrumb":
        return `<div class="disnote-breadcrumb" data-unresolved="true">${LIBRARY_MESSAGES.BREADCRUMB_UNAVAILABLE}</div>`;
      case "syncedBlock":
        return `<div class="disnote-synced">${this.renderInline(
          block.content
        )}${block.children ? this.renderBlocks(block.children) : ""}</div>`;
      case "templateButton": {
        const label =
          typeof block.props["label"] === "string"
            ? block.props["label"]
            : "Template Button";
        return `<span class="disnote-template" data-readonly="true">${escapeHtml(
          label
        )}</span>`;
      }
      case "toggleHeading1":
      case "toggleHeading2":
      case "toggleHeading3": {
        const level =
          block.type === "toggleHeading1"
            ? 1
            : block.type === "toggleHeading2"
            ? 2
            : 3;
        const body = block.children ? this.renderBlocks(block.children) : "";
        return `<details class="disnote-toggle-heading"><summary><h${level}>${this.renderInline(
          block.content
        )}</h${level}></summary>${body}</details>`;
      }
      case "video": {
        const url =
          typeof block.props["url"] === "string" ? block.props["url"] : "";
        const src = this.safeBlockUrl(block, url);
        return src
          ? `<figure><video src="${escapeHtml(src)}" controls></video></figure>`
          : "<figure></figure>";
      }
      case "audio": {
        const url =
          typeof block.props["url"] === "string" ? block.props["url"] : "";
        const src = this.safeBlockUrl(block, url);
        return src
          ? `<figure><audio src="${escapeHtml(src)}" controls></audio></figure>`
          : "<figure></figure>";
      }
      case "file": {
        const url =
          typeof block.props["url"] === "string" ? block.props["url"] : "";
        const name =
          typeof block.props["name"] === "string"
            ? block.props["name"]
            : "Attachment";
        const href = this.safeBlockUrl(block, url);
        return href
          ? `<div class="disnote-file"><a href="${escapeHtml(
              href
            )}">${escapeHtml(name)}</a></div>`
          : `<div class="disnote-file">${escapeHtml(name)}</div>`;
      }
      case "tableDb":
      case "board":
      case "listDb":
      case "gallery":
      case "calendar":
      case "timeline":
      case "map": {
        const title =
          typeof block.props["title"] === "string"
            ? block.props["title"]
            : "Database";
        const databaseId =
          typeof block.props["databaseId"] === "string"
            ? block.props["databaseId"]
            : "";
        return `<div class="disnote-database" data-view="${escapeHtml(
          block.type
        )}" data-database-id="${escapeHtml(databaseId)}"><h3>${escapeHtml(
          title
        )}</h3></div>`;
      }
      default:
        return this.renderUnknown(block, "unknown-block");
    }
  }

  private renderUnknown(
    block: DisNoteBlock,
    code: "unknown-block" | "unsupported-version"
  ): string {
    this.warnings.push({
      blockId: block.id,
      code,
      message:
        code === "unsupported-version"
          ? LIBRARY_MESSAGES.unsupportedBlockVersion(block.type, block.version)
          : LIBRARY_MESSAGES.unknownBlockFallback(block.type),
    });
    // Preserve — never silently convert to a paragraph, never execute.
    return `<div class="disnote-unknown-block" data-type="${escapeHtml(
      block.type
    )}" data-block-id="${escapeHtml(block.id)}">${escapeHtml(
      block.type
    )}</div>`;
  }

  private safeBlockUrl(block: DisNoteBlock, value: string): string | null {
    if (value.length === 0) return null;
    const safe = safeHref(value, this.policy.link);
    if (!safe) {
      this.warnings.push({
        blockId: block.id,
        code: "unsafe-url",
        message: LIBRARY_MESSAGES.UNSAFE_BLOCK_URL_DROPPED(block.type),
      });
    }
    return safe;
  }

  renderInline(content: DisNoteInline[] | undefined): string {
    if (!content) return "";
    return content.map((node) => this.renderInlineNode(node)).join("");
  }

  private renderInlineNode(node: DisNoteInline): string {
    switch (node.type) {
      case "text":
        return this.renderText(node);
      case "link": {
        const href = safeHref(node.href, this.policy.link);
        const inner = node.content
          .map((t: TextInline) => this.renderText(t))
          .join("");
        if (!href) {
          this.warnings.push({
            blockId: "",
            code: "unsafe-url",
            message: LIBRARY_MESSAGES.UNSAFE_LINK_DROPPED(node.href),
          });
          return `<span>${inner}</span>`;
        }
        return `<a href="${escapeHtml(
          href
        )}" rel="noopener noreferrer">${inner}</a>`;
      }
      case "mention":
        return `<span class="disnote-mention" data-entity-type="${escapeHtml(
          node.entityType
        )}" data-entity-id="${escapeHtml(node.entityId)}">@${escapeHtml(
          node.label
        )}</span>`;
      case "reference":
        return `<span class="disnote-reference" data-target-type="${escapeHtml(
          node.targetType
        )}" data-target-id="${escapeHtml(node.targetId)}">${escapeHtml(
          node.label
        )}</span>`;
      default:
        return "";
    }
  }

  private renderText(node: TextInline): string {
    let html = escapeHtml(node.text);
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case "bold":
          html = `<strong>${html}</strong>`;
          break;
        case "italic":
          html = `<em>${html}</em>`;
          break;
        case "underline":
          html = `<u>${html}</u>`;
          break;
        case "strike":
          html = `<s>${html}</s>`;
          break;
        case "code":
          html = `<code>${html}</code>`;
          break;
        case "textColor": {
          const c = safeColor(mark.value);
          if (c) html = `<span style="color:${c}">${html}</span>`;
          break;
        }
        case "backgroundColor": {
          const c = safeColor(mark.value);
          if (c) html = `<span style="background-color:${c}">${html}</span>`;
          break;
        }
      }
    }
    return html;
  }
}

function clampLevel(level: unknown): 1 | 2 | 3 {
  return level === 2 ? 2 : level === 3 ? 3 : 1;
}
