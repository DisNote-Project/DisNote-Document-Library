import { LIBRARY_MESSAGES } from "../../core/messages.js";
import type { ReactNode } from "react";
import {
  safeUrl,
  type DisNoteBlock,
  type DisNoteInline,
} from "../../core/index.js";
import { InlineRenderer } from "./InlineRenderer.js";
import { useDocumentRenderContext } from "../context/context.js";

const LIST_TYPES = new Set(["bulletListItem", "numberedListItem"]);
const SAFE_INLINE_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i;

/** Render a list of blocks, grouping consecutive list items into <ul>/<ol>. */
export function BlockList({ blocks }: { blocks: DisNoteBlock[] }): ReactNode {
  const { blockRenderers, registry } = useDocumentRenderContext();
  const out: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i]!;
    const definition = registry.get(block.type);
    if (
      LIST_TYPES.has(block.type) &&
      !blockRenderers?.[block.type] &&
      definition !== undefined &&
      block.version <= definition.version
    ) {
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
              {b.children && b.children.length > 0 ? (
                <BlockList blocks={b.children} />
              ) : null}
            </li>
          ))}
        </Tag>
      );
      continue;
    }
    out.push(<BlockRenderer key={block.id} block={block} />);
    i++;
  }
  return <>{out}</>;
}

export function BlockRenderer({ block }: { block: DisNoteBlock }): ReactNode {
  const { theme, blockRenderers, registry } = useDocumentRenderContext();
  const customRenderer = blockRenderers?.[block.type];
  if (customRenderer) {
    return customRenderer({
      block,
      renderInline: (content) => <InlineRenderer content={content} />,
      renderChildren: (blocks) =>
        blocks && blocks.length > 0 ? <BlockList blocks={blocks} /> : null,
    });
  }
  const definition = registry.get(block.type);
  if (!definition) return <UnknownBlock block={block} reason="unregistered" />;
  if (block.version > definition.version) {
    return <UnknownBlock block={block} reason="unsupported-version" />;
  }

  switch (block.type) {
    case "paragraph":
      return (
        <p>
          <InlineRenderer content={block.content} />
        </p>
      );
    case "heading": {
      const level =
        block.props["level"] === 2 ? 2 : block.props["level"] === 3 ? 3 : 1;
      const Tag = `h${level}` as "h1" | "h2" | "h3";
      return (
        <Tag id={block.id}>
          <InlineRenderer content={block.content} />
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote
          style={{
            borderLeft: `3px solid ${theme.colors.border}`,
            paddingLeft: 12,
            color: theme.colors.textMuted,
          }}
        >
          <InlineRenderer content={block.content} />
        </blockquote>
      );
    case "toggle":
      return (
        <details className="disnote-toggle" open>
          <summary>
            <InlineRenderer content={block.content} />
          </summary>
          {block.children && block.children.length > 0 ? (
            <BlockList blocks={block.children} />
          ) : null}
        </details>
      );
    case "checklistItem": {
      const checked = block.props["checked"] === true;
      return (
        <div className="disnote-check">
          <input type="checkbox" disabled checked={checked} readOnly />{" "}
          <span>
            <InlineRenderer content={block.content} />
          </span>
        </div>
      );
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
      return (
        <pre
          style={{
            background: theme.colors.surface,
            padding: 12,
            borderRadius: 6,
            overflowX: "auto",
          }}
        >
          <code className={`language-${lang}`}>{code}</code>
        </pre>
      );
    }
    case "divider":
      return (
        <hr
          style={{
            border: "none",
            borderTop: `1px solid ${theme.colors.border}`,
          }}
        />
      );
    case "callout": {
      const intent =
        typeof block.props["intent"] === "string"
          ? (block.props["intent"] as string)
          : "info";
      return (
        <aside
          className="disnote-callout"
          data-intent={intent}
          style={{
            background: theme.colors.surface,
            padding: 12,
            borderRadius: 6,
          }}
        >
          <InlineRenderer content={block.content} />
          {block.children && block.children.length > 0 ? (
            <BlockList blocks={block.children} />
          ) : null}
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
    case "columnList":
      return (
        <div
          className="disnote-column-list"
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 24,
            width: "100%",
            margin: "12px 0",
            flexWrap: "wrap",
          }}
        >
          {block.children && block.children.length > 0 ? (
            <BlockList blocks={block.children} />
          ) : null}
        </div>
      );
    case "column": {
      const width =
        typeof block.props["width"] === "number"
          ? block.props["width"]
          : undefined;
      const flexStyle =
        width !== undefined
          ? { flex: `0 0 ${width * 100}%`, maxWidth: `${width * 100}%` }
          : { flex: 1 };
      return (
        <div className="disnote-column" style={{ ...flexStyle, minWidth: 0 }}>
          {block.children && block.children.length > 0 ? (
            <BlockList blocks={block.children} />
          ) : null}
        </div>
      );
    }
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
  const rows =
    (block.props["rows"] as unknown as Array<{ cells?: DisNoteInline[][] }>) ||
    [];
  return (
    <div
      className="disnote-table-container"
      style={{ overflowX: "auto", margin: "16px 0" }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid var(--disnote-border, #e2e8f0)",
        }}
      >
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {(row.cells || []).map((cell, cIdx) => (
                <td
                  key={cIdx}
                  style={{
                    padding: 8,
                    border: "1px solid var(--disnote-border, #e2e8f0)",
                    minWidth: 80,
                  }}
                >
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
  const code =
    typeof block.props["code"] === "string" ? block.props["code"] : "";
  return (
    <div
      className="disnote-math-block"
      style={{
        padding: "12px 16px",
        background: "var(--disnote-surface, #f8fafc)",
        borderRadius: 6,
        margin: "12px 0",
        textAlign: "center",
        fontStyle: "italic",
      }}
    >
      🧮 $${code || "E = mc^2"}$$
    </div>
  );
}

function BookmarkBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const { urlPolicy } = useDocumentRenderContext();
  const url = typeof block.props["url"] === "string" ? block.props["url"] : "";
  const title =
    typeof block.props["title"] === "string"
      ? block.props["title"]
      : "Web Link";
  const description =
    typeof block.props["description"] === "string"
      ? block.props["description"]
      : "";
  const image =
    typeof block.props["image"] === "string" ? block.props["image"] : "";
  const href = safeUrl(url, urlPolicy);
  const imageUrl = safeUrl(image, {
    allowedSchemes: ["https:", "http:"],
    allowRelative: true,
  });
  const body = (
    <>
      <div
        className="bookmark-details"
        style={{
          padding: 12,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            className="bookmark-title"
            style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}
          >
            {title}
          </div>
          <div
            className="bookmark-desc"
            style={{ fontSize: 12, color: "#64748b" }}
          >
            {description}
          </div>
        </div>
        <div
          className="bookmark-url"
          style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}
        >
          🔗 {url}
        </div>
      </div>
      {imageUrl && (
        <img
          className="bookmark-image"
          src={imageUrl}
          alt=""
          style={{ width: 120, objectFit: "cover" }}
        />
      )}
    </>
  );
  const style = {
    display: "flex",
    textDecoration: "none",
    color: "inherit",
    border: "1px solid var(--disnote-border, #e2e8f0)",
    borderRadius: 6,
    overflow: "hidden",
    margin: "16px 0",
    background: "var(--disnote-card, #ffffff)",
  };
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="disnote-bookmark-card"
      style={style}
    >
      {body}
    </a>
  ) : (
    <div className="disnote-bookmark-card" style={style}>
      {body}
    </div>
  );
}

function TableOfContentsBlock(): ReactNode {
  const { headings, theme } = useDocumentRenderContext();
  return (
    <nav
      aria-label="Table of contents"
      className="disnote-toc-block"
      style={{
        padding: 12,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 6,
        background: theme.colors.surface,
        margin: "16px 0",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: 13,
          color: theme.colors.textMuted,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {LIBRARY_MESSAGES.TABLE_OF_CONTENTS}
      </div>
      {headings.length === 0 ? (
        <span style={{ color: theme.colors.textMuted }}>
          {LIBRARY_MESSAGES.NO_HEADINGS}
        </span>
      ) : (
        headings.map((heading) => (
          <a
            key={heading.blockId}
            href={`#${encodeURIComponent(heading.blockId)}`}
            style={{
              display: "block",
              fontSize: 13,
              color: theme.colors.link,
              padding: "2px 0",
              marginLeft: Math.max(0, heading.level - 1) * 16,
            }}
          >
            {heading.text || "Untitled heading"}
          </a>
        ))
      )}
    </nav>
  );
}

function BreadcrumbBlock(): ReactNode {
  return (
    <div
      className="disnote-breadcrumb-block"
      data-unresolved="true"
      style={{ fontSize: 12, color: "#64748b", margin: "12px 0" }}
    >
      Breadcrumb unavailable
    </div>
  );
}

function SyncedBlock({ block }: { block: DisNoteBlock }): ReactNode {
  return (
    <div
      className="disnote-synced-block"
      style={{
        borderLeft: "2px solid #ef4444",
        paddingLeft: 12,
        margin: "16px 0",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#ef4444",
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {LIBRARY_MESSAGES.SYNCED_CONTENT}
      </div>
      <InlineRenderer content={block.content} />
      {block.children && block.children.length > 0 ? (
        <BlockList blocks={block.children} />
      ) : null}
    </div>
  );
}

function TemplateButton({ block }: { block: DisNoteBlock }): ReactNode {
  const label =
    typeof block.props["label"] === "string"
      ? block.props["label"]
      : "Template Button";
  return (
    <span
      className="disnote-template-button"
      data-readonly="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        border: "1px solid var(--disnote-border, #e2e8f0)",
        borderRadius: 6,
        background: "#f1f5f9",
        margin: "12px 0",
      }}
    >
      ➕ {label}
    </span>
  );
}

function ToggleHeading({
  level,
  block,
}: {
  level: 1 | 2 | 3;
  block: DisNoteBlock;
}): ReactNode {
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  return (
    <details
      className="disnote-toggle-heading"
      open
      style={{ margin: "16px 0" }}
    >
      <summary style={{ cursor: "pointer", listStyle: "none" }}>
        <Tag style={{ display: "inline", margin: 0 }}>
          <InlineRenderer content={block.content} />
        </Tag>
      </summary>
      <div style={{ marginTop: 8, paddingLeft: 16 }}>
        {block.children && block.children.length > 0 ? (
          <BlockList blocks={block.children} />
        ) : null}
      </div>
    </details>
  );
}

function VideoBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const { urlPolicy } = useDocumentRenderContext();
  const url = typeof block.props["url"] === "string" ? block.props["url"] : "";
  const src = safeUrl(url, urlPolicy);
  const caption =
    typeof block.props["caption"] === "string" ? block.props["caption"] : "";
  return (
    <figure style={{ margin: "16px 0", width: "100%" }}>
      {src ? (
        <video
          src={src}
          controls
          style={{
            width: "100%",
            maxHeight: 400,
            borderRadius: 6,
            background: "#000000",
          }}
        />
      ) : null}
      {caption && (
        <figcaption
          style={{
            fontSize: 12,
            color: "#64748b",
            marginTop: 4,
            textAlign: "center",
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function AudioBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const { urlPolicy } = useDocumentRenderContext();
  const url = typeof block.props["url"] === "string" ? block.props["url"] : "";
  const src = safeUrl(url, urlPolicy);
  const caption =
    typeof block.props["caption"] === "string" ? block.props["caption"] : "";
  return (
    <figure style={{ margin: "16px 0", width: "100%" }}>
      {src ? <audio src={src} controls style={{ width: "100%" }} /> : null}
      {caption && (
        <figcaption
          style={{
            fontSize: 12,
            color: "#64748b",
            marginTop: 4,
            textAlign: "center",
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function FileBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const { urlPolicy } = useDocumentRenderContext();
  const url = typeof block.props["url"] === "string" ? block.props["url"] : "";
  const href = safeUrl(url, urlPolicy);
  const name =
    typeof block.props["name"] === "string"
      ? block.props["name"]
      : "Attachment";
  const caption =
    typeof block.props["caption"] === "string" ? block.props["caption"] : "";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: 12,
        border: "1px solid var(--disnote-border, #e2e8f0)",
        borderRadius: 6,
        margin: "12px 0",
        background: "var(--disnote-surface, #f8fafc)",
      }}
    >
      {href ? (
        <a
          href={href}
          download
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#2563eb",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          📎 {name} (Download)
        </a>
      ) : (
        <span>{name}</span>
      )}
      {caption && (
        <div style={{ fontSize: 12, color: "#64748b" }}>{caption}</div>
      )}
    </div>
  );
}

function DatabaseViewBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const title =
    typeof block.props["title"] === "string"
      ? block.props["title"]
      : "Database";
  const databaseId =
    typeof block.props["databaseId"] === "string"
      ? block.props["databaseId"]
      : "";
  return (
    <div
      className="disnote-database-widget"
      data-database-id={databaseId}
      style={{
        border: "1px solid var(--disnote-border, #e2e8f0)",
        borderRadius: 6,
        overflow: "hidden",
        margin: "20px 0",
        background: "var(--disnote-card, #ffffff)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          borderBottom: "1px solid var(--disnote-border, #e2e8f0)",
          background: "#f8fafc",
        }}
      >
        <span style={{ fontWeight: 600 }}>
          📊 {title} ({block.type})
        </span>
        <small style={{ color: "#94a3b8", fontSize: 11 }}>
          {LIBRARY_MESSAGES.DATABASE_REFERENCE}
        </small>
      </div>
    </div>
  );
}

function ImageBlock({ block }: { block: DisNoteBlock }): ReactNode {
  const { assetResolver } = useDocumentRenderContext();

  // BlockNote stores the image URL directly in block.props.url (base64 or remote).
  // assetId / assetResolver is an optional secondary lookup for custom asset stores.
  const directUrl =
    typeof block.props["url"] === "string"
      ? (block.props["url"] as string).trim()
      : "";
  const assetId =
    typeof block.props["assetId"] === "string"
      ? (block.props["assetId"] as string)
      : "";
  const alt =
    typeof block.props["name"] === "string"
      ? (block.props["name"] as string)
      : "";
  const caption =
    typeof block.props["caption"] === "string"
      ? (block.props["caption"] as string)
      : "";
  const previewWidth =
    typeof block.props["previewWidth"] === "number"
      ? (block.props["previewWidth"] as number)
      : undefined;

  const safeImageUrl = (value: string): string | null =>
    SAFE_INLINE_IMAGE.test(value)
      ? value
      : safeUrl(value, {
          allowedSchemes: ["https:", "http:"],
          allowRelative: true,
        });

  let url: string | undefined;
  if (directUrl && safeImageUrl(directUrl)) {
    url = safeImageUrl(directUrl)!;
  } else if (assetId) {
    const candidate = assetResolver?.(assetId)?.trim() ?? "";
    if (candidate && safeImageUrl(candidate)) url = safeImageUrl(candidate)!;
  }

  if (!url) {
    return (
      <figure data-asset={assetId || directUrl}>
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    );
  }
  return (
    <figure style={{ margin: "16px 0" }}>
      <img
        src={url}
        alt={alt}
        loading="lazy"
        style={{
          maxWidth: "100%",
          borderRadius: 4,
          display: "block",
          ...(previewWidth ? { width: previewWidth } : {}),
        }}
      />
      {caption && (
        <figcaption
          style={{
            fontSize: 12,
            color: "#64748b",
            marginTop: 4,
            textAlign: "center",
          }}
        >
          {caption}
        </figcaption>
      )}
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
      style={{
        border: `1px dashed ${theme.colors.border}`,
        padding: 8,
        borderRadius: 6,
        color: theme.colors.textMuted,
      }}
    >
      Unsupported block: <code>{block.type}</code>
    </div>
  );
}
