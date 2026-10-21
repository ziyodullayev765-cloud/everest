import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
const DB = process.env.E2E_DATABASE_URL ?? "postgres://learn:learn@localhost:5432/learn_e2e";

/** E2E runs a production build against a freshly migrated + seeded database. */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /access|pwa/ },
  ],
  webServer: {
    command: `node scripts/e2e-reset.mjs && npx next start -p ${PORT}`,
    port: PORT,
    timeout: 120_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: DB, APP_SECRET: "e2e-secret-0123456789abcdef0123456789abcdef", APP_URL: `http://localhost:${PORT}`, NODE_ENV: "production" },
  },
});
