import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.next/**",
      "storybook-static/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["packages/document-core/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "document-core must stay framework-neutral" },
            { name: "react-dom", message: "document-core must stay framework-neutral" },
            { name: "next", message: "document-core must not depend on Next.js" },
            { name: "mongodb", message: "document-core must not depend on a database" },
            { name: "mongoose", message: "document-core must not depend on a database" },
          ],
          patterns: [
            { group: ["@blocknote/*"], message: "document-core must not depend on the editor vendor" },
            { group: ["yjs"], message: "document-core must not depend on the CRDT" },
            { group: ["@disnote/*"], message: "document-core is the dependency root" },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/renderer-html/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "react" }, { name: "react-dom" }],
          patterns: [{ group: ["@blocknote/*"] }],
        },
      ],
    },
  },
);
