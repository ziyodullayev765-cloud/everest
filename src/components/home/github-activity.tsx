import type { CSSProperties } from "react";
import { EdSection } from "@/components/site/ed-section";
import { getCopy, getLocale } from "@/lib/i18n/server";
import type { ContributionCalendar } from "@/lib/github";
import { HomeHeading } from "./section-heading";

/**
 * A year of public GitHub activity as a grid of days (real data, refreshed a
 * few times a day). The cells light up column by column when the section
 * scrolls into view.
 */
export async function GithubActivity({ calendar }: { calendar: ContributionCalendar }) {
  const [copy, locale] = await Promise.all([getCopy(), getLocale()]);
  const fmt = new Intl.NumberFormat(locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US");
  return (
    <EdSection id="github" className="mx-auto w-[min(1200px,calc(100%-2rem))] py-14 sm:py-24">
      {/* Activity only: no link to the GitHub profile, the code stays private. */}
      <HomeHeading eyebrow={copy.homePage.githubEyebrow} title={copy.homePage.githubTitle} />

      <div className="glow-card mt-10 p-5 sm:p-8">
        <p className="text-[var(--fg-secondary)]">
          <span className="font-display text-fg text-[clamp(2rem,5vw,3.2rem)] leading-none">{fmt.format(calendar.total)}</span>{" "}
          {copy.homePage.githubTotal}
        </p>
        <div className="gh-scroll mt-6 overflow-x-auto pb-2" tabIndex={0} aria-label="GitHub">
          <div className="gh-grid" role="img" aria-label={`${fmt.format(calendar.total)} ${copy.homePage.githubTotal}`}>
            {calendar.weeks.map((week, w) => (
              <div key={w} className="gh-week" style={{ "--w": w } as CSSProperties}>
                {week.map((d, i) =>
                  d.date ? (
                    <span key={d.date} className="gh-day" data-level={d.level} title={`${d.count} · ${d.date}`} />
                  ) : (
                    <span key={`pad-${i}`} className="gh-day gh-day--pad" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="text-muted mt-4 flex items-center justify-end gap-1.5 text-xs" aria-hidden>
          {copy.homePage.githubLess}
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="gh-day" data-level={l} />
          ))}
          {copy.homePage.githubMore}
        </div>
      </div>
    </EdSection>
  );
}
