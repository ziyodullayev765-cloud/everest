#!/usr/bin/env node
/**
 * Creates (or promotes) the portfolio administrator.
 *
 *   npm run admin:create -- you@example.com
 *   npm run admin:create -- you@example.com --revoke    # remove admin rights
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
 * environment or .env.local. The service-role key bypasses RLS: keep it on
 * your machine / CI secrets only. It is never imported by the Next.js app.
 *
 * The password is typed interactively (hidden) and never stored in a file.
 * For non-interactive environments, set ADMIN_PASSWORD for a single run.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import readline from "node:readline";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
let email = args.find((a) => !a.startsWith("--"));

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else rl.output.write("*");
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

function strong(pw) {
  return pw.length >= 12 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw);
}

async function findUserByEmail(admin, address) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === address.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  if (!url || !serviceKey) {
    fail("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local) before running this script.");
  }
  email ||= await ask("Admin email: ");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("Please provide a valid email address.");

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let user = await findUserByEmail(supabase.auth.admin, email);

  if (revoke) {
    if (!user) fail(`No user with email ${email}.`);
    const { error } = await supabase.from("admin_users").delete().eq("user_id", user.id);
    if (error) fail(error.message);
    console.log(`\n✔ Admin access revoked for ${email}.\n`);
    return;
  }

  if (!user) {
    let password = process.env.ADMIN_PASSWORD;
    if (!password) {
      password = await ask("Choose a password (min 12 chars, upper/lowercase + number): ", { hidden: true });
      const again = await ask("Repeat password: ", { hidden: true });
      if (password !== again) fail("Passwords do not match.");
    }
    if (!strong(password)) fail("Password too weak: use at least 12 characters with upper- and lowercase letters and a number.");

    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) fail(`Could not create user: ${error.message}`);
    user = data.user;
    console.log(`✔ Created auth user ${email}`);
  } else {
    console.log(`• User ${email} already exists — granting admin access (password unchanged).`);
  }

  const { error } = await supabase.from("admin_users").upsert({ user_id: user.id }, { onConflict: "user_id" });
  if (error) fail(`Could not grant admin access: ${error.message}. Did you run the SQL migration?`);

  console.log(`\n✔ ${email} is now an administrator. Sign in at /admin/login\n`);
}

main().catch((e) => fail(e?.message ?? String(e)));
