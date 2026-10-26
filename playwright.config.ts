import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "DATABASE_PATH=./data/e2e-grimorio.db PORT=3100 npm run start",
    url: "http://127.0.0.1:3100/acceso",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
