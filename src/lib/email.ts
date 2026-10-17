import "server-only";

/**
 * Optional e-mail copy of each contact message, sent through Resend
 * (https://resend.com). Off until RESEND_API_KEY and CONTACT_NOTIFY_EMAIL are
 * set in the hosting environment; the key never reaches the browser.
 */
export interface ContactEmail {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY && !!process.env.CONTACT_NOTIFY_EMAIL;
}

export async function sendContactEmail(msg: ContactEmail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFY_EMAIL;
  if (!key || !to) return false;
  const from = process.env.RESEND_FROM || "Portfolio <onboarding@resend.dev>";
  const subject = `New message from ${msg.name}${msg.subject?.trim() ? `: ${msg.subject.trim()}` : ""}`.slice(0, 200);
  const text = [`From: ${msg.name} <${msg.email}>`, msg.subject?.trim() ? `Subject: ${msg.subject.trim()}` : "", "", msg.message]
    .filter((l, i) => l !== "" || i === 2)
    .join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], reply_to: msg.email, subject, text }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error("[email] resend failed:", res.status, (await res.text().catch(() => "")).slice(0, 300));
    return false;
  }
  return true;
}
