import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { createReactBlockSpec, createReactInlineContentSpec } from "@blocknote/react";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { safeUrl } from "../../core/index.js";

type CalloutIntent = "info" | "warning" | "success" | "danger";

const CALLOUT_ORDER: CalloutIntent[] = ["info", "warning", "success", "danger"];
const CALLOUT_ICON: Record<CalloutIntent, string> = {
  info: "💡",
  warning: "⚠️",
  success: "✅",
  danger: "🚫",
};

function normalizeIntent(value: unknown): CalloutIntent {
  return value === "warning" || value === "success" || value === "danger" ? value : "info";
}

function safeEditorUrl(value: string): string | null {
  return safeUrl(value, {
    allowedSchemes: ["https:", "http:", "mailto:", "tel:"],
    allowRelative: true,
  });
}

function collectHeadings(blocks: readonly unknown[]): Array<{ id: string; level: number; text: string }> {
  const result: Array<{ id: string; level: number; text: string }> = [];
  const walk = (items: readonly unknown[]): void => {
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      const block = item as {
        id?: unknown;
        type?: unknown;
        props?: Record<string, unknown>;
        content?: Array<{ type?: string; text?: string }>;
        children?: unknown[];
      };
      if (block.type === "heading") {
        result.push({
          id: typeof block.id === "string" ? block.id : "",
          level: block.props?.["level"] === 2 ? 2 : block.props?.["level"] === 3 ? 3 : 1,
          text: (block.content ?? [])
            .filter((node) => node.type === "text")
            .map((node) => node.text ?? "")
            .join(""),
        });
      }
      if (Array.isArray(block.children)) walk(block.children);
    }
  };
  walk(blocks);
  return result;
}

function cloneInsertableBlocks(blocks: readonly unknown[]): Record<string, unknown>[] {
  return blocks.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const source = item as Record<string, unknown>;
    const clone: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      if (key === "id") continue;
      clone[key] = key === "children" && Array.isArray(value)
        ? cloneInsertableBlocks(value)
        : value;
    }
    return [clone];
  });
}

/**
 * A first-class callout block. BlockNote has no native callout, so this is the
 * one custom block spec we keep. It renders like a Notion callout (accent, icon,
 * tinted background) and lets the writer cycle the intent by clicking the icon.
 */
const calloutSpec = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      intent: { default: "info", values: ["info", "warning", "success", "danger"] },
    },
    content: "inline",
  },
  {
    render: ({ block, editor, contentRef }) => {
      const intent = normalizeIntent(block.props.intent);
      const cycle = (): void => {
        const next = CALLOUT_ORDER[(CALLOUT_ORDER.indexOf(intent) + 1) % CALLOUT_ORDER.length]!;
        editor.updateBlock(block, { props: { intent: next } });
      };
      return (
        <div className="disnote-editor-callout" data-intent={intent}>
          <button
            type="button"
            className="disnote-editor-callout__icon"
            contentEditable={false}
            title="Change callout style"
            aria-label="Change callout style"
            onClick={cycle}
          >
            {CALLOUT_ICON[intent]}
          </button>
          <div className="disnote-editor-callout__body" ref={contentRef} />
        </div>
      );
    },
  },
);

/**
 * Lossless fallback for blocks DisNote persists but BlockNote has no spec for
 * (e.g. images pending an upload provider, or namespaced consumer blocks).
 * Renders its inline content plainly — no vendor label leaks into the surface.
 */
const genericSpec = createReactBlockSpec(
  {
    type: "disnoteBlock",
    propSchema: {
      originalType: { default: "paragraph" },
      originalVersion: { default: 1 },
      propsJson: { default: "{}" },
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef }) => (
      <div className="disnote-editor-generic" data-disnote-type={String(block.props.originalType)}>
        <div ref={contentRef} />
      </div>
    ),
  },
);

const mention = createReactInlineContentSpec(
  {
    type: "mention",
    propSchema: {
      entityType: { default: "user" },
      entityId: { default: "" },
      label: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ inlineContent }) => (
      <span className="disnote-editor-mention" data-entity-id={inlineContent.props.entityId}>
        @{inlineContent.props.label}
      </span>
    ),
  },
);

const reference = createReactInlineContentSpec(
  {
    type: "reference",
    propSchema: {
      targetType: { default: "document" },
      targetId: { default: "" },
      label: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ inlineContent }) => (
      <span className="disnote-editor-reference" data-target-id={inlineContent.props.targetId}>
        {inlineContent.props.label}
      </span>
    ),
  },
);

const mathSpec = createReactBlockSpec(
  {
    type: "math",
    propSchema: { code: { default: "" } },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const code = block.props.code || "E = mc^2";
      const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        editor.updateBlock(block, { props: { code: e.target.value } });
      };
      return (
        <div className="disnote-editor-math" contentEditable={false}>
          <div className="math-preview">🧮 $${code}$$</div>
          <input className="math-input" value={code} onChange={onChange} placeholder="Enter LaTeX formula..." />
        </div>
      );
    },
  }
);

const bookmarkSpec = createReactBlockSpec(
  {
    type: "bookmark",
    propSchema: {
      url: { default: "" },
      title: { default: "" },
      description: { default: "" },
      image: { default: "" }
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const { url, title, description, image } = block.props;
      if (!url) {
        return (
          <div className="disnote-editor-bookmark-empty" contentEditable={false}>
            <span>🔗 Add a Web Bookmark</span>
            <input
              type="text"
              placeholder="Paste link here..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = safeEditorUrl(e.currentTarget.value);
                  if (val) {
                    editor.updateBlock(block, {
                      props: { url: val, title: val },
                    });
                  }
                }
              }}
            />
          </div>
        );
      }
      const href = safeEditorUrl(url);
      const imageUrl = safeEditorUrl(image);
      const body = (
        <>
          <div className="bookmark-details">
            <div className="bookmark-title">{title || "Link Preview"}</div>
            <div className="bookmark-desc">{description || "No description available"}</div>
            <div className="bookmark-url">🔗 {url}</div>
          </div>
          {imageUrl && <img className="bookmark-image" src={imageUrl} alt="" />}
        </>
      );
      return href
        ? <a href={href} target="_blank" rel="noopener noreferrer" className="disnote-editor-bookmark-card" contentEditable={false}>{body}</a>
        : <div className="disnote-editor-bookmark-card" contentEditable={false}>{body}</div>;
    },
  }
);

const tableOfContentsSpec = createReactBlockSpec(
  { type: "tableOfContents", propSchema: {}, content: "none" },
  {
    render: ({ editor }) => {
      const headings = collectHeadings(editor.document as unknown[]);
      return (
        <nav className="disnote-editor-toc" aria-label="Table of contents" contentEditable={false}>
          <div className="toc-title">Table of Contents</div>
          {headings.length === 0
            ? <div className="toc-item">No headings</div>
            : headings.map((heading) => (
              <div key={heading.id} className={`toc-item toc-item--${heading.level}`}>
                {heading.text || "Untitled heading"}
              </div>
            ))}
        </nav>
      );
    },
  }
);

const breadcrumbSpec = createReactBlockSpec(
  { type: "breadcrumb", propSchema: {}, content: "none" },
  {
    render: () => (
      <div className="disnote-editor-breadcrumb" data-unresolved="true" contentEditable={false}>
        Breadcrumb unavailable
      </div>
    ),
  }
);

const syncedBlockSpec = createReactBlockSpec(
  {
    type: "syncedBlock",
    propSchema: { syncedBlockId: { default: "" } },
    content: "inline",
  },
  {
    render: ({ contentRef }) => (
      <div className="disnote-editor-synced-container">
        <div className="synced-header" contentEditable={false}>🔄 Synced Block</div>
        <div className="synced-body" ref={contentRef} />
      </div>
    ),
  }
);

const templateButtonSpec = createReactBlockSpec(
  {
    type: "templateButton",
    propSchema: { label: { default: "Template Button" } },
    content: "inline",
  },
  {
    render: ({ block, editor, contentRef }) => {
      const templateBlocks = cloneInsertableBlocks(block.children ?? []);
      return (
        <div className="disnote-editor-template-container">
          <button
            className="template-btn"
            type="button"
            contentEditable={false}
            disabled={templateBlocks.length === 0}
            onClick={() => {
              if (templateBlocks.length > 0) {
                editor.insertBlocks(templateBlocks as never, block, "after");
              }
            }}
          >
            ➕ {block.props.label}
          </button>
          <div ref={contentRef} style={{ display: "none" }} />
        </div>
      );
    },
  }
);

const toggleHeading1Spec = createReactBlockSpec(
  { type: "toggleHeading1", propSchema: {}, content: "inline" },
  {
    render: ({ contentRef }) => (
      <details className="disnote-editor-toggle-heading h1-toggle" open>
        <summary ref={contentRef} />
      </details>
    ),
  }
);

const toggleHeading2Spec = createReactBlockSpec(
  { type: "toggleHeading2", propSchema: {}, content: "inline" },
  {
    render: ({ contentRef }) => (
      <details className="disnote-editor-toggle-heading h2-toggle" open>
        <summary ref={contentRef} />
      </details>
    ),
  }
);

const toggleHeading3Spec = createReactBlockSpec(
  { type: "toggleHeading3", propSchema: {}, content: "inline" },
  {
    render: ({ contentRef }) => (
      <details className="disnote-editor-toggle-heading h3-toggle" open>
        <summary ref={contentRef} />
      </details>
    ),
  }
);

function makeDbViewSpec(type: string, emoji: string) {
  return createReactBlockSpec(
    {
      type,
      propSchema: {
        databaseId: { default: "" },
        title: { default: "Database" }
      },
      content: "none",
    },
    {
      render: ({ block }) => (
        <div className="disnote-editor-db-view-widget" data-database-id={block.props.databaseId} contentEditable={false}>
          <div className="db-widget-header">
            <span>{emoji} {block.props.title} ({type})</span>
            <small>Database reference</small>
          </div>
        </div>
      ),
    }
  );
}

const tableDbSpec = makeDbViewSpec("tableDb", "📊");
const boardSpec = makeDbViewSpec("board", "📋");
const listDbSpec = makeDbViewSpec("listDb", "📑");
const gallerySpec = makeDbViewSpec("gallery", "🖼️");
const calendarSpec = makeDbViewSpec("calendar", "📅");
const timelineSpec = makeDbViewSpec("timeline", "⏳");
const mapSpec = makeDbViewSpec("map", "🗺️");

// Use official multi-column block specs from @blocknote/xl-multi-column

/**
 * The editor schema. We hand-pick the block specs DisNote's document model can
 * round-trip, so the slash menu never offers a block we cannot persist.
 */
export const disNoteBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    checkListItem: defaultBlockSpecs.checkListItem,
    toggleListItem: defaultBlockSpecs.toggleListItem,
    quote: defaultBlockSpecs.quote,
    codeBlock: defaultBlockSpecs.codeBlock,
    divider: defaultBlockSpecs.divider,
    callout: calloutSpec(),
    disnoteBlock: genericSpec(),
    table: defaultBlockSpecs.table,
    image: defaultBlockSpecs.image,
    video: defaultBlockSpecs.video,
    audio: defaultBlockSpecs.audio,
    file: defaultBlockSpecs.file,
    math: mathSpec(),
    bookmark: bookmarkSpec(),
    tableOfContents: tableOfContentsSpec(),
    breadcrumb: breadcrumbSpec(),
    syncedBlock: syncedBlockSpec(),
    templateButton: templateButtonSpec(),
    toggleHeading1: toggleHeading1Spec(),
    toggleHeading2: toggleHeading2Spec(),
    toggleHeading3: toggleHeading3Spec(),
    tableDb: tableDbSpec(),
    board: boardSpec(),
    listDb: listDbSpec(),
    gallery: gallerySpec(),
    calendar: calendarSpec(),
    timeline: timelineSpec(),
    map: mapSpec(),
    columnList: ColumnListBlock,
    column: ColumnBlock,
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention,
    reference,
  },
  styleSpecs: defaultStyleSpecs,
});

export type DisNoteBlockNoteSchema = typeof disNoteBlockNoteSchema;
