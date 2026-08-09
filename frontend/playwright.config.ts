import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.PNPI_E2E_PORT ?? "3000";
const baseURL = process.env.PNPI_E2E_BASE_URL ?? `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer:
    process.env.PNPI_E2E_USE_EXISTING_SERVER === "1"
      ? undefined
      : {
          command: `npm run dev -- --port ${e2ePort}`,
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
