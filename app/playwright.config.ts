import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Semua test memakai database Neon yang sama, jadi dijalankan berurutan.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Kompilasi pertama Next dev bisa lambat.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    navigationTimeout: 60_000,
    // Lokal: pakai Google Chrome yang terpasang (tidak perlu unduh browser Playwright).
    // CI: pakai Chromium dari `npx playwright install chromium`.
    channel: process.env.CI ? undefined : "chrome",
  },
  projects: [
    // Login sekali per peran lewat form, simpan cookie ke e2e/.auth/<peran>.json
    { name: "setup", testMatch: /auth\.setup\.ts/, teardown: "cleanup" },
    { name: "cleanup", testMatch: /cleanup\.teardown\.ts/ },
    {
      name: "chrome",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], channel: process.env.CI ? undefined : "chrome" },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
