import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgres://learn:learn@localhost:5432/learn_test";

/** Fresh schema for every test run. */
export default async function setup() {
  const sql = postgres(TEST_DB, { max: 1, onnotice: () => {} });
  try {
    await sql`drop schema if exists public cascade`;
    await sql`drop schema if exists drizzle cascade`;
    await sql`create schema public`;
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  } catch (e) {
    console.warn("⚠ Integration DB unavailable — integration tests will fail:", (e as Error).message);
  } finally {
    await sql.end();
  }
}
