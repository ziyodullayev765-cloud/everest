import "server-only";

export interface ContributionDay {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
  count: number;
}

export interface ContributionCalendar {
  username: string;
  total: number;
  weeks: ContributionDay[][];
}

const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function isGithubUsername(v: string | null | undefined): v is string {
  return !!v && USERNAME_RE.test(v);
}

/** Pulls a username out of a github.com profile URL. */
export function githubUserFromUrl(url: string | null | undefined): string | null {
  const m = /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)\/?$/i.exec(url?.trim() ?? "");
  return m && isGithubUsername(m[1]) ? m[1]! : null;
}

/**
 * Parses GitHub's public contributions calendar markup
 * (github.com/users/<name>/contributions) into weeks of days.
 * Exported for tests.
 */
export function parseContributions(html: string, username: string): ContributionCalendar | null {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = /^\s*(\d[\d,]*)\s+contribution/i.exec(m[2]!);
    counts.set(m[1]!, n ? Number(n[1]!.replace(/,/g, "")) : 0);
  }
  const days: ContributionDay[] = [];
  for (const m of html.matchAll(/<td\b([^>]*)>/g)) {
    const attrs = m[1]!;
    const date = /\bdata-date="(\d{4}-\d{2}-\d{2})"/.exec(attrs)?.[1];
    const level = /\bdata-level="([0-4])"/.exec(attrs)?.[1];
    if (!date || level === undefined) continue;
    const id = /\bid="([^"]+)"/.exec(attrs)?.[1];
    days.push({ date, level: Number(level) as ContributionDay["level"], count: (id && counts.get(id)) || 0 });
  }
  if (!days.length) return null;
  days.sort((a, b) => a.date.localeCompare(b.date));
  // Group into Sunday-first weeks, padding the first week so rows line up by weekday.
  const weeks: ContributionDay[][] = [];
  let week: ContributionDay[] = [];
  const firstDow = new Date(`${days[0]!.date}T00:00:00Z`).getUTCDay();
  for (let i = 0; i < firstDow; i++) week.push({ date: "", level: 0, count: -1 });
  for (const d of days) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push(week);
  const totalMatch = /([\d,]+)\s+contributions?\s+in the last year/i.exec(html.replace(/\s+/g, " "));
  const total = totalMatch ? Number(totalMatch[1]!.replace(/,/g, "")) : days.reduce((s, d) => s + d.count, 0);
  return { username, total, weeks };
}

/** The last year of public GitHub activity, cached for six hours. Null when unavailable. */
export async function getContributions(username: string): Promise<ContributionCalendar | null> {
  if (!isGithubUsername(username)) return null;
  try {
    const res = await fetch(`https://github.com/users/${username}/contributions`, {
      headers: { "user-agent": "Mozilla/5.0 (portfolio contributions widget)", accept: "text/html" },
      next: { revalidate: 21600, tags: ["github"] },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return parseContributions(await res.text(), username);
  } catch {
    return null;
  }
}
