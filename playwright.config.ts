import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// En Arch Linux el WebKit de Playwright necesita bibliotecas de Ubuntu que
// `install-deps` no puede instalar (requiere sudo/apt). El script
// `scripts/setup-webkit-arch.sh` las deja en la caché del usuario y las enlaza
// al bundle; con eso alcanza con saltear la validación de dependencias.
if (
  process.platform === "linux" &&
  existsSync(path.join(os.homedir(), ".cache/playwright-webkit-libs"))
) {
  process.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS ??= "1";
}

const PORT = 3100;
const isCI = Boolean(process.env.CI);
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Tier 1 (cada PR): desktop-chrome, pixel-7, galaxy-s24, iphone-se,
 * iphone-15, ipad-pro-11, ipados-real-ua.
 * Tier 2 (nightly / manual): el resto de proyectos.
 *
 * Los proyectos se eligen con `--project=...`; ver `e2e/README.md`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // SQLite con WAL: 2 workers es el punto dulce. Se puede subir con
  // PLAYWRIGHT_WORKERS=4 si la máquina lo permite.
  workers: Number(process.env.PLAYWRIGHT_WORKERS ?? (isCI ? 2 : 2)),
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: isCI
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ]
    : [
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    // --- Escritorio ---
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "desktop-safari", use: { ...devices["Desktop Safari"] } },

    // --- Android (Chromium real) ---
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
    { name: "galaxy-s24", use: { ...devices["Galaxy S24"] } },
    { name: "galaxy-a55", use: { ...devices["Galaxy A55"] } },
    { name: "galaxy-tab-s9", use: { ...devices["Galaxy Tab S9"] } },

    // --- iOS (WebKit) ---
    { name: "iphone-se", use: { ...devices["iPhone SE (3rd gen)"] } },
    { name: "iphone-15", use: { ...devices["iPhone 15"] } },
    {
      name: "iphone-16-pro-max",
      use: { ...devices["iPhone 16 Pro Max"] },
    },

    // --- iPad (WebKit) ---
    { name: "ipad-pro-11", use: { ...devices["iPad Pro 11"] } },
    { name: "ipad-mini", use: { ...devices["iPad Mini"] } },
    {
      // iPadOS 13+ real: UA Macintosh + maxTouchPoints > 1. Es el caso que
      // Safari envía en dispositivos físicos y el que valida la segunda rama
      // del detector (`src/lib/device-detection.ts`).
      name: "ipados-real-ua",
      use: {
        ...devices["iPad Pro 11"],
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      },
    },

    // --- iOS Chrome (CriOS, mismo motor WebKit) ---
    {
      name: "iphone-chrome",
      use: {
        ...devices["iPhone 15"],
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1",
      },
    },
  ],
  webServer: {
    // Base de datos efímera por ejecución: usuarios únicos por test, demo
    // aislada. `npm run start` requiere `npm run build` previo.
    command:
      "rm -f ./data/e2e-run.db* ./data/e2e-demo.db* && " +
      "SESSION_SECRET=e2e-session-secret-e2e-session-secret " +
      "DATABASE_PATH=./data/e2e-run.db " +
      "GRIMORIO_DEMO_DB_PATH=./data/e2e-demo.db " +
      `PORT=${PORT} npm run start`,
    url: `${baseURL}/acceso`,
    // Por defecto siempre arranca un servidor nuevo: build y base de datos
    // frescos. `PW_REUSE_SERVER=1` permite engancharse a uno ya levantado.
    reuseExistingServer: process.env.PW_REUSE_SERVER === "1",
    timeout: 120_000,
  },
});
