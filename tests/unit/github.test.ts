import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { githubUserFromUrl, parseContributions } = await import("@/lib/github");

const html = `
<h2 class="f4 text-normal mb-2">
      1,234
      contributions
        in the last year
</h2>
<table><tbody><tr>
<td tabindex="0" data-ix="0" aria-selected="false" aria-describedby="contribution-day-component-1-0" style="width: 10px" data-date="2026-01-05" id="contribution-day-component-1-0" data-level="0" role="gridcell" class="ContributionCalendar-day"></td>
<td tabindex="0" data-ix="1" style="width: 10px" data-date="2026-01-06" id="contribution-day-component-2-0" data-level="3" role="gridcell" class="ContributionCalendar-day"></td>
<td class="ContributionCalendar-label"></td>
</tr></tbody></table>
<tool-tip id="tooltip-1" for="contribution-day-component-1-0" popover="manual" data-direction="n" class="sr-only position-absolute">No contributions on January 5th.</tool-tip>
<tool-tip id="tooltip-2" for="contribution-day-component-2-0" popover="manual" data-direction="n" class="sr-only position-absolute">12 contributions on January 6th.</tool-tip>
`;

describe("GitHub contributions", () => {
  it("parses days, levels, counts and the yearly total", () => {
    const cal = parseContributions(html, "someone")!;
    expect(cal.total).toBe(1234);
    const days = cal.weeks.flat().filter((d) => d.date);
    expect(days).toEqual([
      { date: "2026-01-05", level: 0, count: 0 },
      { date: "2026-01-06", level: 3, count: 12 },
    ]);
    // 2026-01-05 is a Monday, so the first week is padded with one empty Sunday.
    expect(cal.weeks[0]![0]!.date).toBe("");
  });

  it("returns null for markup without a calendar", () => {
    expect(parseContributions("<html></html>", "x")).toBeNull();
  });

  it("reads usernames from profile URLs only", () => {
    expect(githubUserFromUrl("https://github.com/ziyodullayev765-cloud")).toBe("ziyodullayev765-cloud");
    expect(githubUserFromUrl("https://github.com/org/repo")).toBeNull();
    expect(githubUserFromUrl("https://example.com/x")).toBeNull();
  });
});
