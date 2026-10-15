import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against an already-running app (default http://localhost:3000).
 * Admin tests need a configured Supabase project plus E2E_ADMIN_EMAIL /
 * E2E_ADMIN_PASSWORD (and optionally E2E_USER_EMAIL / E2E_USER_PASSWORD for a
 * non-admin account). Without them those tests are skipped.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
