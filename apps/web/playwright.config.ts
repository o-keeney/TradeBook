import { defineConfig, devices } from "@playwright/test";

const previewBase = process.env.PLAYWRIGHT_BASE_URL?.trim();
const baseURL = previewBase || "http://127.0.0.1:3000";
const useRemote = Boolean(previewBase);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: useRemote
    ? undefined
    : {
        command:
          process.env.PLAYWRIGHT_WEB_SERVER_SKIP_BUILD === "1"
            ? "npm run start"
            : "npm run build && npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
