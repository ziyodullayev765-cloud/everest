import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichText } from "@/components/ui/rich-text";

const html = (text: string) => renderToStaticMarkup(<RichText text={text} />);

describe("RichText", () => {
  it("renders headings, lists, emphasis and links", () => {
    const out = html("## Title\n\n- one\n- **two**\n\nSee [site](https://example.com).");
    expect(out).toContain("<h2>Title</h2>");
    expect(out).toContain("<li><strong>two</strong></li>");
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener noreferrer"');
  });
  it("escapes HTML and drops unsafe link targets", () => {
    const out = html("<script>alert(1)</script> [x](javascript:alert(1)) <img src=x onerror=alert(1)>");
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("javascript:");
    expect(out).toContain("&lt;script&gt;");
  });
  it("renders nothing for empty text", () => {
    expect(html("   ")).toBe("");
  });
});
