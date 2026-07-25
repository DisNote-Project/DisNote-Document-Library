import type { Meta, StoryObj } from "@storybook/react";
import { createDocument, heading, paragraph, callout, bulletListItem, text, createDefaultRegistry } from "../core/index.js";
import { DocumentRenderer } from "./index.js";

const registry = createDefaultRegistry();
const sample = createDocument({
  metadata: { title: "Story" },
  blocks: [
    heading(1, [text("DisNote Document")], { id: "h" }),
    paragraph([text("Rendered "), text("without", [{ type: "italic" }]), text(" the editor.")], { id: "p" }),
    bulletListItem([text("one")]),
    bulletListItem([text("two")]),
    callout([text("Callouts carry an intent.")], "warning"),
  ],
});

const meta: Meta<typeof DocumentRenderer> = {
  title: "Renderer/DocumentRenderer",
  component: DocumentRenderer,
  args: { document: sample, registry },
};
export default meta;

type Story = StoryObj<typeof DocumentRenderer>;

export const Light: Story = {};
export const Dark: Story = {
  args: {
    theme: {
      colors: {
        background: "#111315", surface: "#1a1c1c", text: "#e8eaea", textMuted: "#9aa4a4",
        border: "#2b2f2f", focus: "#2dd4bf", selection: "#134e4a", link: "#2dd4bf", danger: "#f87171",
      },
    },
  },
};
