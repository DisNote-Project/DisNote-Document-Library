/**
 * A minimal structural mirror of BlockNote's document JSON. We intentionally do
 * NOT import BlockNote types here so the conversion functions are pure and
 * unit-testable without the editor, and so no vendor type becomes part of the
 * DisNote persisted contract. The real editor produces objects shaped like this.
 */

export interface BnStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  textColor?: string;
  backgroundColor?: string;
}

export interface BnStyledText {
  type: "text";
  text: string;
  styles: BnStyles;
}

export interface BnLink {
  type: "link";
  href: string;
  content: BnStyledText[];
}

export interface BnCustomInline {
  type: string;
  props: Record<string, unknown>;
  content?: BnStyledText[];
}

export type BnInlineContent = BnStyledText | BnLink | BnCustomInline;

export interface BnBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
  content: BnInlineContent[];
  children: BnBlock[];
}
