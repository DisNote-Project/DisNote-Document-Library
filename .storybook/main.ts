import type { StorybookConfig } from "@storybook/react-vite";

/** Storybook config (guideline section 32.6). Requires @storybook/react-vite. */
const config: StorybookConfig = {
  stories: ["../packages/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
};

export default config;
