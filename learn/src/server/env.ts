import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  return v;
}

export const newDatabaseOn = () => process.env.USE_NEW_DATABASE === "1";

export const env = {
  /**
   * USE_NEW_DATABASE=1 switches to the database attached with the NEW_ prefix (the Frankfurt copy,
   * filled by scripts/copy-db.mjs during the build). Removing the flag goes back to DATABASE_URL.
   */
  get databaseUrl() {
    return newDatabaseOn() ? required("NEW_DATABASE_URL") : required("DATABASE_URL");
  },
  get appSecret() {
    const s = required("APP_SECRET");
    if (process.env.NODE_ENV === "production" && s.length < 32) throw new Error("APP_SECRET must be at least 32 characters");
    return s;
  },
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3100").replace(/\/$/, "");
  },
  get maxUploadBytes() {
    return Number(process.env.MAX_UPLOAD_BYTES ?? 4 * 1024 * 1024);
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
