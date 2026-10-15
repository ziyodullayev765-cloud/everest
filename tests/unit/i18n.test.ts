import { describe, expect, it } from "vitest";
import { DICTIONARIES, localizeNav } from "@/lib/i18n/dictionaries";

describe("localizeNav", () => {
  it("points old home-section links at their own pages and translates them", () => {
    const nav = [
      { label: "Highlights", href: "/#highlights", visible: true },
      { label: "Contact", href: "/#contact", visible: true },
      { label: "Blog", href: "https://example.com", visible: true },
    ];
    expect(localizeNav(nav, DICTIONARIES.uz)).toEqual([
      { label: "Yutuqlar", href: "/highlights", visible: true },
      { label: "Aloqa", href: "/contact", visible: true },
      { label: "Blog", href: "https://example.com", visible: true },
    ]);
  });

  it("has the same keys in every language", () => {
    const keys = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === "object" && !Array.isArray(v) ? keys(v).map((s) => `${k}.${s}`) : [k],
      );
    const en = keys(DICTIONARIES.en).sort();
    expect(keys(DICTIONARIES.uz).sort()).toEqual(en);
    expect(keys(DICTIONARIES.ru).sort()).toEqual(en);
  });
});
