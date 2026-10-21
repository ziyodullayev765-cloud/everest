import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  return v;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
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
