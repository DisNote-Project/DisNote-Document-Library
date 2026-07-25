import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  tsconfig: "./tsconfig.json",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? [["html", { open: "never" }], ["list"]] : "list",
  outputDir: "../test-results",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: {
    command: "npm run dev --workspace @disnote/react-demo -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    cwd: "..",
    reuseExistingServer: !process.env["CI"],
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
