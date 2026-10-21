import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts"), "next/headers": path.resolve(import.meta.dirname, "tests/next-headers-stub.ts") } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://learn:learn@localhost:5432/learn_test", APP_SECRET: "test-secret-0123456789abcdef0123456789abcdef" },
  },
});
