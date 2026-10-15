import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MUSIC_CONFIG, PROFILE_CONFIG, RESOURCES, resourceFields, SETTINGS_CONFIG, singletonFields } from "@/lib/cms/resources";

const migrationsDir = path.resolve(__dirname, "../../supabase/migrations");
const sql = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(path.join(migrationsDir, f), "utf8"))
  .join("\n\n");

function columnsOf(table: string): Set<string> {
  const m = new RegExp(`create table if not exists public\\.${table} \\(([\\s\\S]*?)\\n\\);`).exec(sql);
  if (!m) throw new Error(`table ${table} not found in migration`);
  const added = Array.from(
    sql.matchAll(new RegExp(`alter table public\\.${table} add column if not exists ([a-z0-9_]+)`, "g")),
  ).map((x) => x[1]!);
  return new Set([
    ...added,
    ...m[1]!
      .split("\n")
      .map((l) => /^\s+([a-z0-9_]+)\s+/.exec(l)?.[1])
      .filter((c): c is string => !!c && c !== "constraint"),
  ]);
}

describe("CMS config ↔ database schema", () => {
  for (const r of Object.values(RESOURCES)) {
    it(`every ${r.key} field is a column of ${r.table}`, () => {
      const cols = columnsOf(r.table);
      for (const f of resourceFields(r)) expect(cols, `${r.table}.${f.name}`).toContain(f.name);
      expect(cols).toContain("status");
      expect(cols).toContain("sort_order");
    });
  }
  for (const s of [PROFILE_CONFIG, SETTINGS_CONFIG, MUSIC_CONFIG]) {
    it(`every ${s.key} field is a column of ${s.table}`, () => {
      const cols = columnsOf(s.table);
      for (const f of singletonFields(s)) expect(cols, `${s.table}.${f.name}`).toContain(f.name);
    });
  }
  it("enables RLS on every public table", () => {
    const tables = Array.from(sql.matchAll(/create table if not exists public\.([a-z_]+)/g)).map((m) => m[1]);
    for (const t of tables) expect(sql).toContain(`alter table public.${t}`);
  });
});

describe("supabase/setup.sql", () => {
  it("is up to date with the migration and seed (run `npm run db:bundle`)", () => {
    const setup = readFileSync(path.resolve(__dirname, "../../supabase/setup.sql"), "utf8");
    const seed = readFileSync(path.resolve(__dirname, "../../supabase/seed.sql"), "utf8");
    expect(setup).toContain(sql);
    expect(setup).toContain(seed);
  });
});
