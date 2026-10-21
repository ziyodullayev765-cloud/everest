import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

/**
 * scrypt (RFC 7914) from Node's crypto module: memory-hard, no native dependency.
 * Stored format: scrypt$N$r$p$salt$hash (base64url).
 */
const N = 1 << 15;
const r = 8;
const p = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, n: number, rr: number, pp: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password.normalize("NFKC"), salt, KEYLEN, { N: n, r: rr, p: pp, maxmem: MAXMEM }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, N, r, p);
  return ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, rr, pp, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(password, Buffer.from(salt, "base64url"), Number(n), Number(rr), Number(pp));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A hash of a random password, used to equalise timing when the username does not exist. */
let dummy: Promise<string> | null = null;
export function dummyHash() {
  return (dummy ??= hashPassword(randomBytes(16).toString("hex")));
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Parol kamida 8 ta belgidan iborat bo‘lishi kerak.";
  if (pw.length > 128) return "Parol juda uzun.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Parolda harf va raqam bo‘lishi kerak.";
  return null;
}

/** Readable temporary password for provisioning (no ambiguous characters). */
export function generateTempPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out.slice(0, 4) + "-" + out.slice(4, 8) + "-" + out.slice(8, 10) + String(bytes[0] % 10) + String(bytes[1] % 10);
}
