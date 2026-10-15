import { describe, expect, it } from "vitest";
import { formatMonthYear, formatRange, isSafeHref, safeInternalPath, slugify } from "@/lib/utils";

describe("slugify", () => {
  it("handles Uzbek Latin apostrophes and spacing", () => {
    expect(slugify("Loyihalarimni ko’rish")).toBe("loyihalarimni-korish");
    expect(slugify("  Oʻzbekiston  —  2026 ")).toBe("ozbekiston-2026");
  });
  it("transliterates Cyrillic", () => {
    expect(slugify("Шаҳруз лойиҳаси")).toBe("shahruz-loyihasi");
  });
  it("never produces leading/trailing hyphens", () => {
    expect(slugify("---Hello---")).toBe("hello");
    expect(slugify("!!!")).toBe("");
  });
});

describe("URL safety", () => {
  it("rejects script URLs", () => {
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("JAVASCRIPT:alert(1)")).toBe(false);
    expect(isSafeHref("data:text/html,hi")).toBe(false);
    expect(isSafeHref("//evil.com")).toBe(false);
  });
  it("accepts http(s), mailto, tel and relative paths", () => {
    expect(isSafeHref("https://github.com")).toBe(true);
    expect(isSafeHref("mailto:a@b.co")).toBe(true);
    expect(isSafeHref("tel:+998901234567")).toBe(true);
    expect(isSafeHref("/projects")).toBe(true);
  });
  it("prevents open redirects", () => {
    expect(safeInternalPath("https://evil.com", "/admin")).toBe("/admin");
    expect(safeInternalPath("//evil.com", "/admin")).toBe("/admin");
    expect(safeInternalPath("/\\evil.com", "/admin")).toBe("/admin");
    expect(safeInternalPath("/admin/projects")).toBe("/admin/projects");
  });
});

describe("dates", () => {
  it("formats without timezone drift", () => {
    expect(formatMonthYear("2024-01-01")).toBe("yanvar 2024");
    expect(formatRange("2023-09-01", null, true)).toBe("sentabr 2023 — hozirgacha");
    expect(formatRange(null, null, false)).toBe("");
  });
});
