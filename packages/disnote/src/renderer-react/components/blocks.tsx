import type { ReactNode } from "react";
import type { DisNoteBlock, DisNoteInline } from "../../core/index.js";
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
    case "toggle":
      return (
        <details className="disnote-toggle" open>
          <summary><InlineRenderer content={block.content} /></summary>
          {block.children && block.children.length > 0 ? <BlockList blocks={block.children} /> : null}
        </details>
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
    case "table":
      return <TableBlock block={block} />;
    case "math":
      return <MathBlock block={block} />;
    case "bookmark":
      return <BookmarkBlock block={block} />;
    case "tableOfContents":
      return <TableOfContentsBlock />;
    case "breadcrumb":
      return <BreadcrumbBlock />;
    case "syncedBlock":
      return <SyncedBlock block={block} />;
    case "templateButton":
      return <TemplateButton block={block} />;
    case "toggleHeading1":
      return <ToggleHeading level={1} block={block} />;
    case "toggleHeading2":
      return <ToggleHeading level={2} block={block} />;
    case "toggleHeading3":
      return <ToggleHeading level={3} block={block} />;
    case "video":
      return <VideoBlock block={block} />;
    case "audio":
      return <AudioBlock block={block} />;
    case "file":
      return <FileBlock block={block} />;
    case "tableDb":
    case "board":
    case "listDb":
    case "gallery":
    case "calendar":
    case "timeline":
    case "map":
      return <DatabaseViewBlock block={block} />;
    default:
      return <UnknownBlock block={block} reason="unregistered" />;
  }
}

function TableBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const rows = ((block.props["rows"] as unknown) as Array<{ cells?: DisNoteInline[][] }>) || [];
  return (
    <div className="disnote-table-container" style={{ overflowX: "auto", margin: "16px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid var(--disnote-border, #e2e8f0)" }}>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {(row.cells || []).map((cell, cIdx) => (
                <td key={cIdx} style={{ padding: 8, border: "1px solid var(--disnote-border, #e2e8f0)", minWidth: 80 }}>
                  <InlineRenderer content={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MathBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const code = typeof block.props["code"] === "string" ? block.props["code"] : "";
  return (
    <div className="disnote-math-block" style={{ padding: "12px 16px", background: "var(--disnote-surface, #f8fafc)", borderRadius: 6, margin: "12px 0", textAlign: "center", fontStyle: "italic" }}>
      🧮 $${code || "E = mc^2"}$$
    </div>
  );
}

function BookmarkBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const url = typeof block.props["url"] === "string" ? block.props["url"] : "";
  const title = typeof block.props["title"] === "string" ? block.props["title"] : "Web Link";
  const description = typeof block.props["description"] === "string" ? block.props["description"] : "";
  const image = typeof block.props["image"] === "string" ? block.props["image"] : "";
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="disnote-bookmark-card" style={{ display: "flex", textDecoration: "none", color: "inherit", border: "1px solid var(--disnote-border, #e2e8f0)", borderRadius: 6, overflow: "hidden", margin: "16px 0", background: "var(--disnote-card, #ffffff)" }}>
      <div className="bookmark-details" style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div className="bookmark-title" style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{title}</div>
          <div className="bookmark-desc" style={{ fontSize: 12, color: "#64748b" }}>{description}</div>
        </div>
        <div className="bookmark-url" style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>🔗 {url}</div>
      </div>
      {image && <img className="bookmark-image" src={image} alt="preview" style={{ width: 120, objectFit: "cover" }} />}
    </a>
  );
}

function TableOfContentsBlock(): ReactNode {
  return (
    <div className="disnote-toc-block" style={{ padding: 12, border: "1px solid var(--disnote-border, #e2e8f0)", borderRadius: 6, background: "var(--disnote-surface, #f8fafc)", margin: "16px 0" }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>📖 Table of Contents</div>
      <div style={{ fontSize: 13, color: "#2563eb", cursor: "pointer", padding: "2px 0" }}>· Product Overview</div>
      <div style={{ fontSize: 13, color: "#2563eb", cursor: "pointer", padding: "2px 0", marginLeft: 16 }}>·· Key Deliverables</div>
      <div style={{ fontSize: 13, color: "#2563eb", cursor: "pointer", padding: "2px 0", marginLeft: 16 }}>·· Implementation Milestones</div>
    </div>
  );
}

function BreadcrumbBlock(): ReactNode {
  return (
    <div className="disnote-breadcrumb-block" style={{ fontSize: 12, color: "#64748b", margin: "12px 0" }}>
      Workspace / Projects / <strong>Launch Roadmap</strong>
    </div>
  );
}

function SyncedBlock({ block }: { block: DisNoteBlock }): ReactNode {
  return (
    <div className="disnote-synced-block" style={{ borderLeft: "2px solid #ef4444", paddingLeft: 12, margin: "16px 0" }}>
      <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, marginBottom: 4 }}>🔄 Synced Content</div>
      {block.children && block.children.length > 0 ? <BlockList blocks={block.children} /> : null}
    </div>
  );
}

function TemplateButton({ block }: { block: DisNoteBlock }): ReactNode {
  const label = typeof block.props["label"] === "string" ? block.props["label"] : "Template Button";
  return (
    <button className="disnote-template-button" type="button" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1px solid var(--disnote-border, #e2e8f0)", borderRadius: 6, background: "#f1f5f9", cursor: "pointer", margin: "12px 0" }}>
      ➕ {label}
    </button>
  );
}

function ToggleHeading({ level, block }: { level: 1 | 2 | 3; block: DisNoteBlock }): ReactNode {
  const Tag = (`h${level}` as "h1" | "h2" | "h3");
  return (
    <details className="disnote-toggle-heading" open style={{ margin: "16px 0" }}>
      <summary style={{ cursor: "pointer", listStyle: "none" }}>
        <Tag style={{ display: "inline", margin: 0 }}><InlineRenderer content={block.content} /></Tag>
      </summary>
      <div style={{ marginTop: 8, paddingLeft: 16 }}>
        {block.children && block.children.length > 0 ? <BlockList blocks={block.children} /> : null}
      </div>
    </details>
  );
}

function VideoBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const url = typeof block.props["url"] === "string" ? block.props["url"] : "";
  const caption = typeof block.props["caption"] === "string" ? block.props["caption"] : "";
  return (
    <figure style={{ margin: "16px 0", width: "100%" }}>
      <video src={url} controls style={{ width: "100%", maxHeight: 400, borderRadius: 6, background: "#000000" }} />
      {caption && <figcaption style={{ fontSize: 12, color: "#64748b", marginTop: 4, textAlign: "center" }}>{caption}</figcaption>}
    </figure>
  );
}

function AudioBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const url = typeof block.props["url"] === "string" ? block.props["url"] : "";
  const caption = typeof block.props["caption"] === "string" ? block.props["caption"] : "";
  return (
    <figure style={{ margin: "16px 0", width: "100%" }}>
      <audio src={url} controls style={{ width: "100%" }} />
      {caption && <figcaption style={{ fontSize: 12, color: "#64748b", marginTop: 4, textAlign: "center" }}>{caption}</figcaption>}
    </figure>
  );
}

function FileBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const url = typeof block.props["url"] === "string" ? block.props["url"] : "";
  const name = typeof block.props["name"] === "string" ? block.props["name"] : "Attachment";
  const caption = typeof block.props["caption"] === "string" ? block.props["caption"] : "";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 12, border: "1px solid var(--disnote-border, #e2e8f0)", borderRadius: 6, margin: "12px 0", background: "var(--disnote-surface, #f8fafc)" }}>
      <a href={url} download style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
        📎 {name} (Download)
      </a>
      {caption && <div style={{ fontSize: 12, color: "#64748b" }}>{caption}</div>}
    </div>
  );
}

function DatabaseViewBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const title = typeof block.props["title"] === "string" ? block.props["title"] : "Database";
  return (
    <div className="disnote-database-widget" style={{ border: "1px solid var(--disnote-border, #e2e8f0)", borderRadius: 6, overflow: "hidden", margin: "20px 0", background: "var(--disnote-card, #ffffff)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--disnote-border, #e2e8f0)", background: "#f8fafc" }}>
        <span style={{ fontWeight: 600 }}>📊 {title} ({block.type})</span>
        <small style={{ color: "#94a3b8", fontSize: 11 }}>Connected Database</small>
      </div>
      <div style={{ padding: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", fontSize: 12, color: "#64748b" }}>
              <th style={{ padding: 6 }}>Title</th>
              <th style={{ padding: 6 }}>Status</th>
              <th style={{ padding: 6 }}>Tags</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: 13 }}>
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 6 }}>Sample Item 1</td>
              <td style={{ padding: 6 }}><span style={{ padding: "2px 6px", fontSize: 11, background: "#dcfce7", color: "#15803d", borderRadius: 4 }}>Done</span></td>
              <td style={{ padding: 6 }}><span style={{ padding: "2px 6px", fontSize: 11, background: "#f1f5f9", color: "#64748b", borderRadius: 4 }}>Demo</span></td>
            </tr>
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 6 }}>Sample Item 2</td>
              <td style={{ padding: 6 }}><span style={{ padding: "2px 6px", fontSize: 11, background: "#fef9c3", color: "#a16207", borderRadius: 4 }}>To-do</span></td>
              <td style={{ padding: 6 }}><span style={{ padding: "2px 6px", fontSize: 11, background: "#f1f5f9", color: "#64748b", borderRadius: 4 }}>Feature</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
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
