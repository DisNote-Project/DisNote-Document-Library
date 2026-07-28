import { Fragment, type ReactNode } from "react";
import {
  safeColor,
  safeUrl,
  type DisNoteInline,
  type TextInline,
  type TextMark,
} from "../../core/index.js";
import { useDocumentRenderContext } from "../context/context.js";

function applyMarks(textNode: TextInline, key: number): ReactNode {
  let node: ReactNode = textNode.text;
  for (const mark of textNode.marks ?? []) {
    node = wrapMark(mark, node);
  }
  return <Fragment key={key}>{node}</Fragment>;
}

function wrapMark(mark: TextMark, child: ReactNode): ReactNode {
  switch (mark.type) {
    case "bold":
      return <strong>{child}</strong>;
    case "italic":
      return <em>{child}</em>;
    case "underline":
      return <u>{child}</u>;
    case "strike":
      return <s>{child}</s>;
    case "code":
      return <code>{child}</code>;
    case "textColor": {
      const color = safeColor(mark.value);
      return color ? <span style={{ color }}>{child}</span> : child;
    }
    case "backgroundColor": {
      const color = safeColor(mark.value);
      return color ? <span style={{ backgroundColor: color }}>{child}</span> : child;
    }
    default:
      return child;
  }
}

export function InlineRenderer({ content }: { content: DisNoteInline[] | undefined }): ReactNode {
  const { theme, referenceResolver, urlPolicy } = useDocumentRenderContext();
  if (!content) return null;

  return content.map((node, i) => {
    switch (node.type) {
      case "text":
        return applyMarks(node, i);
      case "link": {
        const href = safeUrl(node.href, urlPolicy);
        const inner = node.content.map((t, j) => applyMarks(t, j));
        if (!href) return <span key={i}>{inner}</span>;
        // If any text node inside the link has an explicit textColor mark,
        // don't force the link color so the mark's inline style wins.
        const hasExplicitColor = node.content.some(
          (t) => t.marks?.some((m) => m.type === "textColor")
        );
        return (
          <a
            key={i}
            href={href}
            rel="noopener noreferrer"
            style={{
              color: hasExplicitColor ? undefined : theme.colors.link,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            {inner}
          </a>
        );
      }
      case "mention":
        return (
          <span key={i} className="disnote-mention" data-entity-id={node.entityId}>
            @{node.label}
          </span>
        );
      case "reference": {
        const resolution = referenceResolver?.(node.targetType, node.targetId, node.label);
        const label = resolution?.label ?? node.label;
        const resolvedHref = resolution?.status === "resolved" && resolution.href
          ? safeUrl(resolution.href, urlPolicy)
          : null;
        if (resolvedHref) {
          return (
            <a key={i} href={resolvedHref} className="disnote-reference" style={{ color: theme.colors.link, textDecoration: "underline", cursor: "pointer" }}>
              {label}
            </a>
          );
        }
        return (
          <span
            key={i}
            className="disnote-reference"
            data-status={resolution?.status ?? "unresolved"}
            data-target-id={node.targetId}
            tabIndex={0}
          >
            {label}
          </span>
        );
      }
      default:
        return null;
    }
  });
}
