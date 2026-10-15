import { beforeEach, describe, expect, it } from "vitest";
import { contactSchema } from "@/lib/validation/contact";
import { buildStoragePath, registerMediaSchema, validateFile } from "@/lib/validation/media";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("contact form schema", () => {
  it("accepts a valid message", () => {
    expect(
      contactSchema.safeParse({ name: "Ali", email: "ali@example.com", subject: "", message: "Salom, hamkorlik bo‘yicha." })
        .success,
    ).toBe(true);
  });
  it("rejects short, invalid or oversized input", () => {
    expect(contactSchema.safeParse({ name: "A", email: "x", subject: "", message: "hi" }).success).toBe(false);
    expect(
      contactSchema.safeParse({ name: "Ali", email: "ali@example.com", subject: "", message: "x".repeat(5001) }).success,
    ).toBe(false);
  });
});

describe("upload validation", () => {
  it("allows images and PDFs up to 10 MB only", () => {
    expect(validateFile({ name: "a.jpg", type: "image/jpeg", size: 1000 })).toBeNull();
    expect(validateFile({ name: "cv.pdf", type: "application/pdf", size: 1000 }, "document")).toBeNull();
    expect(validateFile({ name: "a.svg", type: "image/svg+xml", size: 1000 })).toMatch(/unsupported/);
    expect(validateFile({ name: "a.exe", type: "application/x-msdownload", size: 1000 })).toMatch(/unsupported/);
    expect(validateFile({ name: "big.png", type: "image/png", size: 11 * 1024 * 1024 })).toMatch(/10 MB/);
    expect(validateFile({ name: "cv.pdf", type: "application/pdf", size: 10 }, "image")).toMatch(/image/);
  });

  it("builds descriptive, safe storage paths accepted by the server schema", () => {
    const p = buildStoragePath("Mening Sertifikatim (2024).PDF", "application/pdf", new Date("2026-03-05T00:00:00Z"), 0.123456);
    expect(p).toMatch(/^documents\/2026\/03\/mening-sertifikatim-2024-[a-z0-9]{6}\.pdf$/);
    expect(registerMediaSchema.safeParse({ path: p, fileName: "x.pdf", mimeType: "application/pdf", size: 10 }).success).toBe(
      true,
    );
  });

  it("rejects path traversal and foreign paths at registration", () => {
    for (const path of ["../secret.png", "images/2026/01/../../x.png", "other/2026/01/a.png", "images/2026/01/A B.png"]) {
      expect(registerMediaSchema.safeParse({ path, fileName: "x", mimeType: "image/png", size: 10 }).success).toBe(false);
    }
  });
});

describe("rate limiter", () => {
  beforeEach(() => resetRateLimits());
  it("blocks after the limit within the window and recovers after it", () => {
    const t0 = 1_000_000;
    expect(rateLimit("k", 2, 1000, t0)).toBe(true);
    expect(rateLimit("k", 2, 1000, t0 + 10)).toBe(true);
    expect(rateLimit("k", 2, 1000, t0 + 20)).toBe(false);
    expect(rateLimit("k", 2, 1000, t0 + 1500)).toBe(true);
    expect(rateLimit("other", 2, 1000, t0 + 20)).toBe(true);
  });
});
