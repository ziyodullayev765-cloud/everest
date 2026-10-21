/**
 * Creates (or promotes) the first super admin. Run once on a trusted machine:
 *   npm run admin:create -- --username direktor --name "Maktab direktori"
 * A random temporary password is printed; it must be changed at first sign-in.
 */
import { config } from "dotenv";
if (!process.env.DATABASE_URL) config({ path: ".env.local", quiet: true });
config({ quiet: true });

const { db, closeDb, schema } = await import("../src/server/db");
const { hashPassword, generateTempPassword } = await import("../src/server/auth/password");
const { sql } = await import("drizzle-orm");

const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const username = (arg("username") ?? "admin").toLowerCase();
const name = arg("name") ?? "Bosh administrator";
if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error("Invalid username");

const temp = generateTempPassword();
const existing = await db.select().from(schema.users).where(sql`lower(${schema.users.username}) = ${username}`);
if (existing[0]) {
  await db.update(schema.users).set({ role: "super_admin", status: "active", passwordHash: await hashPassword(temp), mustChangePassword: true }).where(sql`id = ${existing[0].id}`);
  console.log(`✓ ${username} promoted to super admin and password reset.`);
} else {
  await db.insert(schema.users).values({ username, displayName: name, role: "super_admin", passwordHash: await hashPassword(temp), mustChangePassword: true });
  console.log(`✓ Super admin "${username}" created.`);
}
console.log(`  Temporary password: ${temp}\n  (must be changed at first sign-in)`);
await closeDb();
