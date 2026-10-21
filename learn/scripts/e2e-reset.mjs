// Drops and recreates the E2E schema, applies migrations and loads demo data. Refuses non-e2e databases.
import { execSync } from "node:child_process";
import postgres from "postgres";
const url = process.env.DATABASE_URL ?? "";
if (!/e2e/.test(url)) throw new Error("e2e-reset only runs against a database whose URL contains 'e2e'");
const sql = postgres(url, { max: 1, onnotice: () => {} });
await sql`drop schema if exists public cascade`;
await sql`drop schema if exists drizzle cascade`;
await sql`create schema public`;
await sql.end();
execSync("npx tsx scripts/migrate.ts", { stdio: "inherit", env: process.env });
execSync("npx tsx --conditions=react-server scripts/seed.ts", { stdio: "inherit", env: { ...process.env, NODE_ENV: "development" } });
