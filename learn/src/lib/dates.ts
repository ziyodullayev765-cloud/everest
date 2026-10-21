export const DEFAULT_TZ = "Asia/Tashkent";

/** YYYY-MM-DD of a moment in the given time zone. */
export function localDay(d: Date, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Monday (YYYY-MM-DD) of the ISO week containing `day`. */
export function weekStart(day: string) {
  const d = new Date(day + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function lastNDays(today: string, n: number) {
  const out: string[] = [];
  const d = new Date(today + "T00:00:00Z");
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

const fmt = (opts: Intl.DateTimeFormatOptions, locale = "uz-Latn") => new Intl.DateTimeFormat(locale, { timeZone: DEFAULT_TZ, ...opts });

export const formatDate = (d: Date | string) => fmt({ day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
export const formatShortDate = (d: Date | string) => fmt({ day: "numeric", month: "short" }).format(new Date(d));
export const formatDateTime = (d: Date | string) => fmt({ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));
export const formatTime = (d: Date | string) => fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));
export const formatWeekday = (day: string) =>
  new Intl.DateTimeFormat("uz-Latn", { weekday: "short", timeZone: "UTC" }).format(new Date(day + "T00:00:00Z"));
export const formatLongToday = (d = new Date()) => fmt({ weekday: "long", day: "numeric", month: "long" }).format(d);

/** "2 kun 4 soat qoldi" / "3 soat oldin tugadi". */
export function remaining(due: Date | string, now = new Date()) {
  const ms = new Date(due).getTime() - now.getTime();
  const abs = Math.abs(ms);
  const m = Math.floor(abs / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const text = d >= 1 ? `${d} kun${h % 24 ? ` ${h % 24} soat` : ""}` : h >= 1 ? `${h} soat${m % 60 ? ` ${m % 60} daqiqa` : ""}` : `${Math.max(1, m)} daqiqa`;
  return { overdue: ms < 0, hours: ms / 3600000, text: ms < 0 ? `${text} oldin tugadi` : `${text} qoldi` };
}

/** Converts a value from <input type="datetime-local"> (interpreted in Tashkent time) to a Date. */
export function fromLocalInput(v: string | null | undefined): Date | null {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  // Asia/Tashkent is UTC+5 with no DST.
  return new Date(v + ":00+05:00");
}

export function toLocalInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const x = new Date(new Date(d).getTime() + 5 * 3600_000);
  return x.toISOString().slice(0, 16);
}
