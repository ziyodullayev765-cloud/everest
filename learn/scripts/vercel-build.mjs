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
run("npx tsx scripts/migrate.ts", { DATABASE_URL: migrateUrl });
if (process.env.INITIAL_ADMIN_PASSWORD) run("npx tsx --conditions=react-server scripts/bootstrap-admin.ts", { DATABASE_URL: migrateUrl });
run("npx next build");
