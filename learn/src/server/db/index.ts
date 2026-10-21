import "server-only";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { env } from "../env";

type DB = PostgresJsDatabase<typeof schema>;
const globalForDb = globalThis as unknown as { __learnSql?: postgres.Sql; __learnDb?: DB };

function create() {
  const sql = postgres(env.databaseUrl, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    // Pooled connections (pgbouncer/Neon/Supabase transaction mode) do not support prepared statements.
    prepare: process.env.DATABASE_PREPARE === "true",
    onnotice: () => {},
  });
  return { sql, db: drizzle(sql, { schema }) };
}

function get() {
  if (!globalForDb.__learnDb) {
    const { sql, db } = create();
    globalForDb.__learnSql = sql;
    globalForDb.__learnDb = db;
  }
  return globalForDb.__learnDb!;
}

/** Lazily-initialised Drizzle instance (so builds don't need a database). */
export const db = new Proxy({} as DB, {
  get(_t, prop) {
    return Reflect.get(get(), prop);
  },
});

export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Executor = DB | Tx;
export { schema };

export async function closeDb() {
  await globalForDb.__learnSql?.end();
  globalForDb.__learnSql = undefined;
  globalForDb.__learnDb = undefined;
}
