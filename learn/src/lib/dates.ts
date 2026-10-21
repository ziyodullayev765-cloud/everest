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

/*
 * Uzbek names are spelled out here instead of relying on Intl: browser ICU data for "uz" is uneven
 * (Chromium renders short months as "M10"), and server and client must print the same text.
 */
const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const WEEKDAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
const WEEKDAYS_SHORT = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];
const TZ_OFFSET_MS = 5 * 3600_000; // Asia/Tashkent, no DST

/** Wall-clock parts in Tashkent. */
function parts(d: Date | string) {
  const x = new Date(new Date(d).getTime() + TZ_OFFSET_MS);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth(), d: x.getUTCDate(), wd: x.getUTCDay(), h: x.getUTCHours(), min: x.getUTCMinutes() };
}
const hhmm = (p: { h: number; min: number }) => `${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`;

export const formatDate = (d: Date | string) => {
  const p = parts(d);
  return `${p.d}-${MONTHS[p.m]}, ${p.y}`;
};
export const formatShortDate = (d: Date | string) => {
  const p = parts(d);
  return `${p.d}-${MONTHS_SHORT[p.m]}`;
};
export const formatDateTime = (d: Date | string) => {
  const p = parts(d);
  return `${p.d}-${MONTHS_SHORT[p.m]}, ${hhmm(p)}`;
};
export const formatTime = (d: Date | string) => hhmm(parts(d));
/** For YYYY-MM-DD day keys. */
export const formatWeekday = (day: string) => WEEKDAYS_SHORT[new Date(day + "T00:00:00Z").getUTCDay()];
export const formatDayShort = (day: string) => {
  const x = new Date(day + "T00:00:00Z");
  return `${x.getUTCDate()}-${MONTHS_SHORT[x.getUTCMonth()]}`;
};
export const formatLongToday = (d = new Date()) => {
  const p = parts(d);
  return `${WEEKDAYS[p.wd]}, ${p.d}-${MONTHS[p.m]}`;
};

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
