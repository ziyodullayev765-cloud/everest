import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isEmailConfigured, sendContactEmail } from "@/lib/email";
import { embedUrl } from "@/lib/embed";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendContactEmail()", () => {
  it("does nothing until Resend is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTACT_NOTIFY_EMAIL", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(isEmailConfigured()).toBe(false);
    expect(await sendContactEmail({ name: "A", email: "a@b.co", message: "hello" })).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends a plain-text mail that replies to the visitor", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_NOTIFY_EMAIL", "owner@example.com");
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    expect(await sendContactEmail({ name: "Ali", email: "ali@example.com", subject: "Hi", message: "<b>hello</b>" })).toBe(true);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ to: ["owner@example.com"], reply_to: "ali@example.com", subject: "New message from Ali: Hi" });
    expect(body.text).toContain("<b>hello</b>");
    expect(body.html).toBeUndefined();
  });
});

describe("embedUrl()", () => {
  it("converts share links to embeddable ones", () => {
    expect(embedUrl("https://www.youtube.com/watch?v=abc123")).toBe("https://www.youtube-nocookie.com/embed/abc123");
    expect(embedUrl("https://youtu.be/abc123")).toBe("https://www.youtube-nocookie.com/embed/abc123");
    expect(embedUrl("https://vimeo.com/12345")).toBe("https://player.vimeo.com/video/12345");
    expect(embedUrl("https://www.figma.com/proto/KEY/App")).toMatch(/^https:\/\/www\.figma\.com\/embed\?embed_host=share&url=/);
    expect(embedUrl("https://my-app.vercel.app/")).toBe("https://my-app.vercel.app/");
  });
  it("rejects anything that is not https", () => {
    expect(embedUrl("http://example.com")).toBeNull();
    expect(embedUrl("javascript:alert(1)")).toBeNull();
    expect(embedUrl("not a url")).toBeNull();
    expect(embedUrl(null)).toBeNull();
  });
});
