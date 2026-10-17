import { describe, expect, it } from "vitest";
import { buildVCard } from "@/lib/vcard";
import { headingsOf, headingId } from "@/components/ui/rich-text";

describe("buildVCard()", () => {
  it("builds a valid vCard 3.0 with escaped values and CRLF line ends", () => {
    const v = buildVCard({
      name: "Behruz Ziyodullayev",
      title: "Developer, designer; founder",
      email: "me@example.com",
      phone: "+998 90 000 00 00",
      url: "https://behruzjon.vercel.app",
      location: "Tashkent",
      links: [{ label: "telegram", url: "https://t.me/x" }],
    });
    expect(v.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true);
    expect(v).toContain("N:Ziyodullayev;Behruz;;;\r\n");
    expect(v).toContain("FN:Behruz Ziyodullayev\r\n");
    expect(v).toContain("TITLE:Developer\\, designer\\; founder\r\n");
    expect(v).toContain("TEL;TYPE=CELL:+998 90 000 00 00\r\n");
    expect(v.trimEnd().endsWith("END:VCARD")).toBe(true);
  });
  it("leaves out empty fields", () => {
    const v = buildVCard({ name: "Ali", email: null, phone: null });
    expect(v).not.toContain("EMAIL");
    expect(v).not.toContain("TEL");
  });
});

describe("headingsOf()", () => {
  it("lists ## and ### headings with ids matching the rendered ones", () => {
    const toc = headingsOf("Intro\n\n## Why **this**\n\ntext\n\n### Details\n\n- a\n- b");
    expect(toc).toEqual([
      { id: headingId("Why **this**"), text: "Why this", level: 2 },
      { id: headingId("Details"), text: "Details", level: 3 },
    ]);
    expect(toc[0]!.id).toBe("h-why-this");
  });
});
