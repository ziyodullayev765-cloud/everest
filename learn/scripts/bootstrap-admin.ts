/**
 * Creates the first super admin from INITIAL_ADMIN_USERNAME / INITIAL_ADMIN_PASSWORD — only when the
 * database has no users at all, so it can safely run on every deploy. The password must be changed at
 * first sign-in.
 */
import { config } from "dotenv";
if (!process.env.DATABASE_URL) config({ path: ".env.local", quiet: true });

const { db, closeDb, schema } = await import("../src/server/db");
const { hashPassword, passwordProblem } = await import("../src/server/auth/password");
const { sql } = await import("drizzle-orm");

const username = (process.env.INITIAL_ADMIN_USERNAME ?? "admin").toLowerCase();
const password = process.env.INITIAL_ADMIN_PASSWORD ?? "";
const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users);
if (n > 0) {
  console.log("• Users already exist — admin bootstrap skipped.");
} else if (passwordProblem(password)) {
  console.error(`✗ INITIAL_ADMIN_PASSWORD rejected: ${passwordProblem(password)}`);
} else {
  await db.insert(schema.users).values({ username, displayName: "Bosh administrator", role: "super_admin", passwordHash: await hashPassword(password), mustChangePassword: true });
  console.log(`✓ First super admin "${username}" created (must change password at first sign-in).`);
}
await closeDb();
