import "server-only";
import nodemailer from "nodemailer";

/**
 * Outgoing e-mail for replies written in the admin panel. Uses any SMTP
 * account — for a Gmail address: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465,
 * SMTP_USER=you@gmail.com, SMTP_PASS=<a Google "app password">. Credentials
 * stay on the server; nothing is sent until they are set.
 */
export function isMailerConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  /** Display name for the From header, e.g. "Behruz Ziyodullayev". */
  fromName: string;
}

let transport: nodemailer.Transporter | null = null;

export async function sendMail(mail: OutgoingMail): Promise<void> {
  if (!isMailerConfigured()) throw new Error("mailer_not_configured");
  const port = Number(process.env.SMTP_PORT) || 465;
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  await transport.sendMail({
    from: { name: mail.fromName.replace(/["<>\r\n]/g, "").slice(0, 80), address: from },
    to: mail.to,
    subject: mail.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
    text: mail.text,
  });
}
