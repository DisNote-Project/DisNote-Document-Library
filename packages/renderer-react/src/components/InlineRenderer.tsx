import { Fragment, type ReactNode } from "react";
import type { DisNoteInline, TextInline, TextMark } from "@disnote/document-core";
import { useDocumentRenderContext } from "../context/context.js";

const SAFE_SCHEMES = new Set(["https:", "http:", "mailto:", "tel:"]);

function safeHref(href: string): string | null {
  const trimmed = href.trim();
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (!match) return trimmed;
  return SAFE_SCHEMES.has(`${match[1]!.toLowerCase()}:`) ? trimmed : null;
}

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
    case "textColor":
      return <span style={{ color: mark.value }}>{child}</span>;
    case "backgroundColor":
      return <span style={{ backgroundColor: mark.value }}>{child}</span>;
    default:
      return child;
  }
}

export function InlineRenderer({ content }: { content: DisNoteInline[] | undefined }): ReactNode {
  const { theme, referenceResolver } = useDocumentRenderContext();
  if (!content) return null;

  return content.map((node, i) => {
    switch (node.type) {
      case "text":
        return applyMarks(node, i);
      case "link": {
        const href = safeHref(node.href);
        const inner = node.content.map((t, j) => applyMarks(t, j));
        if (!href) return <span key={i}>{inner}</span>;
        return (
          <a key={i} href={href} rel="noopener noreferrer" style={{ color: theme.colors.link }}>
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
          ? safeHref(resolution.href)
          : null;
        if (resolvedHref) {
          return (
            <a key={i} href={resolvedHref} className="disnote-reference" style={{ color: theme.colors.link }}>
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
