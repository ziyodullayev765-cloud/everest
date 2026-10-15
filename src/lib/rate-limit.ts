/**
 * Small in-memory sliding-window limiter. It is per server instance, so on
 * serverless platforms it is a first line of defence only; the contact form
 * is additionally rate limited inside Postgres (submit_contact_message) and
 * Supabase Auth applies its own sign-in rate limits.
 */
const buckets = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (v.every((t) => t <= cutoff)) buckets.delete(k);
    }
    if (buckets.size > MAX_KEYS) buckets.delete(buckets.keys().next().value as string);
  }
  return true;
}

export function resetRateLimits() {
  buckets.clear();
}

/** Best-effort client IP from proxy headers (Vercel / most reverse proxies). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
