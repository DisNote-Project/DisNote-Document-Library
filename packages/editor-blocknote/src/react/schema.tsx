import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { createReactBlockSpec, createReactInlineContentSpec } from "@blocknote/react";

const disNoteBlock = createReactBlockSpec(
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
      <div className="disnote-editor-block" data-disnote-type={block.props.originalType}>
        <span className="disnote-editor-block__label" contentEditable={false}>
          {block.props.originalType}
        </span>
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

export const disNoteBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    disnoteBlock: disNoteBlock(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention,
    reference,
  },
  styleSpecs: defaultStyleSpecs,
});

export type DisNoteBlockNoteSchema = typeof disNoteBlockNoteSchema;
