import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { createReactBlockSpec, createReactInlineContentSpec } from "@blocknote/react";

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
                  const val = e.currentTarget.value;
                  editor.updateBlock(block, {
                    props: {
                      url: val,
                      title: val.split("/")[2] || "Web Link",
                      description: "Web bookmark preview for " + val
                    }
                  });
                }
              }}
            />
          </div>
        );
      }
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="disnote-editor-bookmark-card" contentEditable={false}>
          <div className="bookmark-details">
            <div className="bookmark-title">{title || "Link Preview"}</div>
            <div className="bookmark-desc">{description || "No description available"}</div>
            <div className="bookmark-url">🔗 {url}</div>
          </div>
          {image && <img className="bookmark-image" src={image} alt="preview" />}
        </a>
      );
    },
  }
);

const tableOfContentsSpec = createReactBlockSpec(
  { type: "tableOfContents", propSchema: {}, content: "none" },
  {
    render: () => (
      <div className="disnote-editor-toc" contentEditable={false}>
        <div className="toc-title">📖 Table of Contents</div>
        <div className="toc-item">· Heading 1</div>
        <div className="toc-item toc-item--2">·· Heading 2</div>
        <div className="toc-item toc-item--3">··· Heading 3</div>
      </div>
    ),
  }
);

const breadcrumbSpec = createReactBlockSpec(
  { type: "breadcrumb", propSchema: {}, content: "none" },
  {
    render: () => (
      <div className="disnote-editor-breadcrumb" contentEditable={false}>
        Workspace / Documents / <strong>Notion Demo</strong>
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
      return (
        <div className="disnote-editor-template-container">
          <button className="template-btn" type="button" contentEditable={false} onClick={() => {
            editor.insertBlocks([{ type: "paragraph", content: [{ type: "text", text: "New template item", styles: {} }] } as unknown as never], block, "after");
          }}>
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
        <div className="disnote-editor-db-view-widget" contentEditable={false}>
          <div className="db-widget-header">
            <span>{emoji} {block.props.title} ({type})</span>
            <small>Database View</small>
          </div>
          <div className="db-widget-body">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Sample Item 1</td>
                  <td><span className="badge badge--done">Done</span></td>
                  <td><span className="tag">Demo</span></td>
                </tr>
                <tr>
                  <td>Sample Item 2</td>
                  <td><span className="badge badge--todo">To-do</span></td>
                  <td><span className="tag">Feature</span></td>
                </tr>
              </tbody>
            </table>
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
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention,
    reference,
  },
  styleSpecs: defaultStyleSpecs,
});

export type DisNoteBlockNoteSchema = typeof disNoteBlockNoteSchema;
