import { Fragment, type ComponentType, type ReactNode } from "react";
import type { DisNoteBlock, DisNoteDocument, DisNoteInline, TextInline } from "@disnote/document-core";

interface NativePrimitiveProps {
  children?: ReactNode;
  style?: unknown;
  [key: string]: unknown;
}

export interface NativeRendererPrimitives {
  View: ComponentType<NativePrimitiveProps>;
  Text: ComponentType<NativePrimitiveProps>;
  Image: ComponentType<NativePrimitiveProps>;
}

export interface NativeBlockRendererApi {
  block: DisNoteBlock;
  renderInline(content: DisNoteInline[] | undefined): ReactNode;
  renderChildren(children: DisNoteBlock[] | undefined): ReactNode;
}

export type NativeBlockRenderers = Readonly<
  Record<string, (api: NativeBlockRendererApi) => ReactNode>
>;

export interface DocumentNativeRendererProps {
  document: DisNoteDocument;
  primitives: NativeRendererPrimitives;
  assetResolver?: (assetId: string) => string | undefined;
  blockRenderers?: NativeBlockRenderers;
  style?: unknown;
}

export function DocumentNativeRenderer(props: DocumentNativeRendererProps): ReactNode {
  const { View } = props.primitives;

  const renderText = (node: TextInline, key: number): ReactNode => {
    const { Text } = props.primitives;
    const style: Record<string, unknown> = {};
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") style["fontWeight"] = "700";
      if (mark.type === "italic") style["fontStyle"] = "italic";
      if (mark.type === "underline") style["textDecorationLine"] = "underline";
      if (mark.type === "strike") style["textDecorationLine"] = "line-through";
      if (mark.type === "code") style["fontFamily"] = "monospace";
      if (mark.type === "textColor") style["color"] = mark.value;
      if (mark.type === "backgroundColor") style["backgroundColor"] = mark.value;
    }
    return <Text key={key} style={style}>{node.text}</Text>;
  };

  const renderInline = (content: DisNoteInline[] | undefined): ReactNode =>
    (content ?? []).map((node, index) => {
      if (node.type === "text") return renderText(node, index);
      if (node.type === "link") {
        return <Fragment key={index}>{node.content.map(renderText)}</Fragment>;
      }
      const label = node.type === "mention" ? `@${node.label}` : node.label;
      return <props.primitives.Text key={index}>{label}</props.primitives.Text>;
    });

  const renderBlocks = (blocks: DisNoteBlock[] | undefined): ReactNode =>
    (blocks ?? []).map((block) => {
      const custom = props.blockRenderers?.[block.type];
      if (custom) {
        return (
          <Fragment key={block.id}>
            {custom({ block, renderInline, renderChildren: renderBlocks })}
          </Fragment>
        );
      }

      const { Text, Image } = props.primitives;
      const children = renderBlocks(block.children);
      switch (block.type) {
        case "heading": {
          const level = block.props["level"] === 2 ? 2 : block.props["level"] === 3 ? 3 : 1;
          return <Text key={block.id} accessibilityRole="header" style={{ fontSize: 30 - level * 4, fontWeight: "700" }}>{renderInline(block.content)}</Text>;
        }
        case "paragraph":
        case "quote":
          return <View key={block.id}><Text>{renderInline(block.content)}</Text>{children}</View>;
        case "bulletListItem":
        case "numberedListItem":
          return <View key={block.id} style={{ flexDirection: "row" }}><Text>- </Text><Text>{renderInline(block.content)}</Text>{children}</View>;
        case "checklistItem":
          return <View key={block.id} style={{ flexDirection: "row" }}><Text>{block.props["checked"] === true ? "[x] " : "[ ] "}</Text><Text>{renderInline(block.content)}</Text>{children}</View>;
        case "codeBlock":
          return <Text key={block.id} style={{ fontFamily: "monospace" }}>{String(block.props["code"] ?? "")}</Text>;
        case "divider":
          return <View key={block.id} accessibilityRole="separator" style={{ height: 1 }} />;
        case "callout":
          return <View key={block.id} accessibilityRole="summary"><Text>{renderInline(block.content)}</Text>{children}</View>;
        case "image": {
          const assetId = String(block.props["assetId"] ?? "");
          const uri = props.assetResolver?.(assetId);
          return uri
            ? <Image key={block.id} source={{ uri }} accessibilityLabel={String(block.props["alt"] ?? "")} />
            : <Text key={block.id}>{String(block.props["alt"] ?? "")}</Text>;
        }
        default:
          return <Text key={block.id} accessibilityLabel={`Unsupported block ${block.type}`}>[{block.type}]</Text>;
      }
    });

  return <View style={props.style}>{renderBlocks(props.document.blocks)}</View>;
}
