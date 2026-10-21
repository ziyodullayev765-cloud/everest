import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { env } from "./env";

export const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
/** Keyed hash for IPs etc. so raw identifiers are never stored. */
export const keyedHash = (s: string) => createHmac("sha256", env.appSecret).update(s).digest("hex").slice(0, 32);
