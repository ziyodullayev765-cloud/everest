/**
 * Build entry for Vercel (and any CI): applies pending migrations, bootstraps the first super admin on an
 * empty database, then runs `next build`. The database URL only exists inside the host, so this is where
 * migrations can run without copying secrets anywhere.
 *
 * Env: DATABASE_URL (required at runtime), DATABASE_URL_UNPOOLED (preferred for migrations, set by the
 * Neon integration), INITIAL_ADMIN_USERNAME / INITIAL_ADMIN_PASSWORD (optional, used only while no users exist).
 */
import { execSync } from "node:child_process";

const run = (cmd, env = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
const migrateUrl = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;

if (!migrateUrl) {
  console.error("✗ DATABASE_URL is not set. Connect a Postgres database (e.g. Vercel → Storage → Neon) and redeploy.");
  process.exit(1);
}
// Moving to the database attached with the NEW_ prefix (another region): migrate it, then copy all
// data from the current one (skipped once the new one has data). The old database is only read.
const useNew = process.env.USE_NEW_DATABASE === "1";
const newUrl = process.env.NEW_DATABASE_URL_UNPOOLED || process.env.NEW_POSTGRES_URL_NON_POOLING || process.env.NEW_DATABASE_URL;
if (useNew && !newUrl) {
  console.error("✗ USE_NEW_DATABASE=1 but no NEW_DATABASE_URL is attached.");
  process.exit(1);
}
const target = useNew ? newUrl : migrateUrl;
run("npx tsx scripts/migrate.ts", { DATABASE_URL: target });
if (useNew) run("node scripts/copy-db.mjs", { SOURCE_URL: migrateUrl, TARGET_URL: target });
if (process.env.INITIAL_ADMIN_PASSWORD) run("npx tsx --conditions=react-server scripts/bootstrap-admin.ts", { DATABASE_URL: target });
run("npx next build");
