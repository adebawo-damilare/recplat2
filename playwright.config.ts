import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const runAuth = process.env.E2E_RUN_AUTH === "1";
const skipWebServer = process.env.PLAYWRIGHT_NO_WEBSERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    navigationTimeout: 45_000,
  },
  projects: runAuth
    ? [
        { name: "setup", testMatch: "**/auth.setup.ts" },
        {
          name: "chromium-authenticated",
          dependencies: ["setup"],
          testMatch: "**/authenticated/**/*.spec.ts",
          use: {
            ...devices["Desktop Chrome"],
            storageState: "e2e/.auth/candidate.json",
          },
        },
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
          testIgnore: ["**/auth.setup.ts", "**/authenticated/**/*.spec.ts"],
        },
      ]
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
          testIgnore: ["**/auth.setup.ts", "**/authenticated/**/*.spec.ts"],
        },
      ],
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            ...process.env,
            TALENTBRIDGE_E2E_STUB_FIRESTORE_JOBS: "1",
          },
        },
      }),
});
