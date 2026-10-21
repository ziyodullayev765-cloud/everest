/** Minimal stand-in for next/headers so services can run outside a request in tests. */
const jar = new Map<string, string>();
export async function cookies() {
  return {
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n)! } : undefined),
    set: (n: string, v: string) => void jar.set(n, v),
    delete: (n: string) => void jar.delete(n),
  };
}
export async function headers() {
  return new Headers({ "user-agent": "vitest", "x-forwarded-for": "127.0.0.1" });
}
export const __jar = jar;
