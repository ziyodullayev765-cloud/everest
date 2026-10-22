import { currentLocale, tr } from "@/lib/i18n/tr";
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
const NAMES = {
  uz: {
    months: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
    monthsShort: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"],
    weekdays: ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"],
    weekdaysShort: ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"],
  },
  en: {
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    weekdaysShort: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  },
};
const names = () => NAMES[currentLocale()];
const en = () => currentLocale() === "en";
const TZ_OFFSET_MS = 5 * 3600_000; // Asia/Tashkent, no DST

/** Wall-clock parts in Tashkent. */
function parts(d: Date | string) {
  const x = new Date(new Date(d).getTime() + TZ_OFFSET_MS);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth(), d: x.getUTCDate(), wd: x.getUTCDay(), h: x.getUTCHours(), min: x.getUTCMinutes() };
}
const hhmm = (p: { h: number; min: number }) => `${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`;

export const formatDate = (d: Date | string) => {
  const p = parts(d);
  return en() ? `${p.d} ${names().months[p.m]} ${p.y}` : `${p.d}-${names().months[p.m]}, ${p.y}`;
};
export const formatShortDate = (d: Date | string) => {
  const p = parts(d);
  return en() ? `${p.d} ${names().monthsShort[p.m]}` : `${p.d}-${names().monthsShort[p.m]}`;
};
export const formatDateTime = (d: Date | string) => {
  const p = parts(d);
  return `${formatShortDate(d)}, ${hhmm(p)}`;
};
export const formatTime = (d: Date | string) => hhmm(parts(d));
/** For YYYY-MM-DD day keys. */
export const formatWeekday = (day: string) => names().weekdaysShort[new Date(day + "T00:00:00Z").getUTCDay()];
export const formatDayShort = (day: string) => {
  const x = new Date(day + "T00:00:00Z");
  return en() ? `${x.getUTCDate()} ${names().monthsShort[x.getUTCMonth()]}` : `${x.getUTCDate()}-${names().monthsShort[x.getUTCMonth()]}`;
};
export const formatLongToday = (d = new Date()) => {
  const p = parts(d);
  const w = names().weekdays[p.wd];
  return en() ? `${w}, ${p.d} ${names().months[p.m]}` : `${w}, ${p.d}-${names().months[p.m]}`;
};

/** "2 kun 4 soat qoldi" / "3 soat oldin tugadi". */
export function remaining(due: Date | string, now = new Date()) {
  const ms = new Date(due).getTime() - now.getTime();
  const abs = Math.abs(ms);
  const m = Math.floor(abs / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const [dd, hh, mm] = en() ? ["d", "h", "min"] : ["kun", "soat", "daqiqa"];
  const text = d >= 1 ? `${d} ${dd}${h % 24 ? ` ${h % 24} ${hh}` : ""}` : h >= 1 ? `${h} ${hh}${m % 60 ? ` ${m % 60} ${mm}` : ""}` : `${Math.max(1, m)} ${mm}`;
  return { overdue: ms < 0, hours: ms / 3600000, text: ms < 0 ? tr("{0} oldin tugadi", text) : en() ? `${text} left` : `${text} qoldi` };
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
