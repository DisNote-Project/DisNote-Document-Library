# Block development

Every block needs: a core definition, a props validator, a migration, a
plain-text extractor, a React renderer, an HTML renderer, an editor adapter, a
fixture, a unit test, a round-trip test, accessibility behavior, a Storybook
story, and documentation.

A core block definition looks like:

```ts
export const calloutCore = defineCoreBlock<CalloutProps>({
  type: "callout",
  version: 1,
  capabilities: { inlineContent: true, children: false, selectable: true, draggable: true, commentable: true },
  validateProps(input) { /* returns ValidationResult<CalloutProps> */ },
  migrate(block) { return block; },
  toPlainText(block) { return extractInlineText(block.content ?? []); },
});
```

Renderer and editor registrations are composed in their own packages so the
core package never imports React.
