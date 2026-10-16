import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createPublicClient: () => ({ rpc }) }));
vi.mock("@/lib/env", () => ({ isSupabaseConfigured: true }));

const sendNotification = vi.fn();
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification } }));

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
process.env.VAPID_PRIVATE_KEY = "priv";
process.env.PUSH_SECRET = "s".repeat(64);

const { sendPushToAdmins } = await import("@/lib/push");

describe("sendPushToAdmins", () => {
  beforeEach(() => {
    rpc.mockReset();
    sendNotification.mockReset();
  });

  it("delivers to every admin device and forgets subscriptions that are gone", async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === "push_targets"
        ? {
            data: [
              { endpoint: "https://push.example/a", p256dh: "k1", auth: "a1" },
              { endpoint: "https://push.example/b", p256dh: "k2", auth: "a2" },
            ],
            error: null,
          }
        : { data: null, error: null },
    );
    sendNotification.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint.endsWith("/b")) throw Object.assign(new Error("gone"), { statusCode: 410 });
      return {};
    });

    const delivered = await sendPushToAdmins({ title: "New message", body: "Hi" });

    expect(delivered).toBe(1);
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(JSON.parse(sendNotification.mock.calls[0]![1])).toEqual({ title: "New message", body: "Hi" });
    expect(rpc).toHaveBeenCalledWith("push_forget", { p_secret: "s".repeat(64), p_endpoint: "https://push.example/b" });
  });

  it("sends nothing when the subscription list can't be loaded", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "forbidden" } });
    expect(await sendPushToAdmins({ title: "x", body: "y" })).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
