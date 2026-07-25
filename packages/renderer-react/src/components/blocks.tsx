import type { ReactNode } from "react";
import type { DisNoteBlock } from "@disnote/document-core";
import { InlineRenderer } from "./InlineRenderer.js";
import { useDocumentRenderContext } from "../context/context.js";

const LIST_TYPES = new Set(["bulletListItem", "numberedListItem"]);
const SAFE_ASSET_SCHEME = /^(https?):/i;

/** Render a list of blocks, grouping consecutive list items into <ul>/<ol>. */
export function BlockList({ blocks }: { blocks: DisNoteBlock[] }): ReactNode {
  const { blockRenderers } = useDocumentRenderContext();
  const out: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i]!;
    if (LIST_TYPES.has(block.type) && !blockRenderers?.[block.type]) {
      const type = block.type;
      const group: DisNoteBlock[] = [];
      while (i < blocks.length && blocks[i]!.type === type) {
        group.push(blocks[i]!);
        i++;
      }
      const Tag = type === "bulletListItem" ? "ul" : "ol";
      out.push(
        <Tag key={group[0]!.id}>
          {group.map((b) => (
            <li key={b.id}>
              <InlineRenderer content={b.content} />
              {b.children && b.children.length > 0 ? <BlockList blocks={b.children} /> : null}
            </li>
          ))}
        </Tag>,
      );
      continue;
    }
    out.push(<BlockRenderer key={block.id} block={block} />);
    i++;
  }
  return <>{out}</>;
}

export function BlockRenderer({ block }: { block: DisNoteBlock }): ReactNode {
  const { theme, blockRenderers } = useDocumentRenderContext();
  const customRenderer = blockRenderers?.[block.type];
  if (customRenderer) {
    return customRenderer({
      block,
      renderInline: (content) => <InlineRenderer content={content} />,
      renderChildren: (blocks) => blocks && blocks.length > 0 ? <BlockList blocks={blocks} /> : null,
    });
  }

  switch (block.type) {
    case "paragraph":
      return <p><InlineRenderer content={block.content} /></p>;
    case "heading": {
      const level = block.props["level"] === 2 ? 2 : block.props["level"] === 3 ? 3 : 1;
      const Tag = (`h${level}` as "h1" | "h2" | "h3");
      return <Tag><InlineRenderer content={block.content} /></Tag>;
    }
    case "quote":
      return (
        <blockquote style={{ borderLeft: `3px solid ${theme.colors.border}`, paddingLeft: 12, color: theme.colors.textMuted }}>
          <InlineRenderer content={block.content} />
        </blockquote>
      );
    case "checklistItem": {
      const checked = block.props["checked"] === true;
      return (
        <div className="disnote-check">
          <input type="checkbox" disabled checked={checked} readOnly /> <span><InlineRenderer content={block.content} /></span>
        </div>
      );
    }
    case "codeBlock": {
      const code = typeof block.props["code"] === "string" ? (block.props["code"] as string) : "";
      const lang = typeof block.props["language"] === "string" ? (block.props["language"] as string) : "text";
      return (
        <pre style={{ background: theme.colors.surface, padding: 12, borderRadius: 6, overflowX: "auto" }}>
          <code className={`language-${lang}`}>{code}</code>
        </pre>
      );
    }
    case "divider":
      return <hr style={{ border: "none", borderTop: `1px solid ${theme.colors.border}` }} />;
    case "callout": {
      const intent = typeof block.props["intent"] === "string" ? (block.props["intent"] as string) : "info";
      return (
        <aside className="disnote-callout" data-intent={intent} style={{ background: theme.colors.surface, padding: 12, borderRadius: 6 }}>
          <InlineRenderer content={block.content} />
          {block.children && block.children.length > 0 ? <BlockList blocks={block.children} /> : null}
        </aside>
      );
    }
    case "image":
      return <ImageBlock block={block} />;
    default:
      return <UnknownBlock block={block} reason="unregistered" />;
  }
}

function ImageBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const { assetResolver } = useDocumentRenderContext();
  const assetId = typeof block.props["assetId"] === "string" ? (block.props["assetId"] as string) : "";
  const alt = typeof block.props["alt"] === "string" ? (block.props["alt"] as string) : "";
  const candidate = assetResolver?.(assetId)?.trim();
  const url = candidate && (SAFE_ASSET_SCHEME.test(candidate) || candidate.startsWith("/"))
    ? candidate
    : undefined;
  if (!url) {
    return (
      <figure data-asset={assetId}>
        <figcaption>{alt}</figcaption>
      </figure>
    );
  }
  return (
    <figure>
      <img src={url} alt={alt} loading="lazy" style={{ maxWidth: "100%" }} />
    </figure>
  );
}

export interface UnknownBlockProps {
  block: DisNoteBlock;
  reason: "unregistered" | "unsupported-version" | "invalid";
}

/** Read-only fallback that preserves an unknown block instead of dropping it. */
export function UnknownBlock({ block, reason }: UnknownBlockProps): ReactNode {
  const { theme } = useDocumentRenderContext();
  return (
    <div
      className="disnote-unknown-block"
      data-type={block.type}
      data-reason={reason}
      style={{ border: `1px dashed ${theme.colors.border}`, padding: 8, borderRadius: 6, color: theme.colors.textMuted }}
    >
      Unsupported block: <code>{block.type}</code>
    </div>
  );
}
