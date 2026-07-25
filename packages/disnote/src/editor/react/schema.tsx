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

/**
 * The editor schema. We hand-pick the block specs DisNote's document model can
 * round-trip, so the slash menu never offers a block we cannot persist. Table,
 * file, video, audio and page-break are intentionally excluded for now.
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
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention,
    reference,
  },
  styleSpecs: defaultStyleSpecs,
});

export type DisNoteBlockNoteSchema = typeof disNoteBlockNoteSchema;
