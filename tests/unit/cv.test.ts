import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PDFDocument } from "pdf-lib";
import { buildCv, plain } from "@/lib/cv/build";
import { readingMinutes } from "@/lib/reading";
import { DEFAULT_PROFILE } from "@/lib/defaults";

describe("plain()", () => {
  it("strips the admin's light Markdown", () => {
    expect(plain("## Hi\n**bold** and *it* and `code` and [link](https://x.y)\n- item")).toBe(
      "Hi\nbold and it and code and link\n• item",
    );
  });
  it("swaps the Uzbek okina for a glyph the PDF font has", () => {
    expect(plain("Oʻzbekiston")).toBe("O‘zbekiston");
  });
});

describe("readingMinutes()", () => {
  it("is at least one minute and grows with length", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("word ".repeat(1000))).toBe(5);
  });
});

describe("buildCv()", () => {
  it("produces a valid PDF in Latin and Cyrillic", async () => {
    for (const locale of ["uz", "ru"] as const) {
      const bytes = await buildCv({
        locale,
        name: "Behruz Ziyodullayev",
        profile: { ...DEFAULT_PROFILE, headline: "Dasturchi — Разработчик", short_intro: "Oʻquvchi. Учусь." },
        email: "me@example.com",
        siteUrl: "https://example.com",
        social: [],
        experience: [],
        education: [],
        projects: [],
        skills: [],
        achievements: [],
      });
      expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
      expect(doc.getTitle()).toContain("Behruz");
    }
  });
});
