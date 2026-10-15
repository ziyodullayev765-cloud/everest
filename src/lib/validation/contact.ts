import { z } from "zod";

type ContactMessages = {
  name: string;
  nameLong: string;
  email: string;
  subjectLong: string;
  messageShort: string;
  messageLong: string;
};

const EN: ContactMessages = {
  name: "Please enter your name (at least 2 characters)",
  nameLong: "Name is too long",
  email: "Please enter a valid email address",
  subjectLong: "Subject is too long",
  messageShort: "Message should be at least 10 characters",
  messageLong: "Message is too long (5000 characters max)",
};

/** Shared by the client form and the server action; messages in the visitor's language. */
export function makeContactSchema(m: ContactMessages = EN) {
  return z.object({
    name: z.string().trim().min(2, m.name).max(120, m.nameLong),
    email: z.string().trim().email(m.email).max(254),
    subject: z.string().trim().max(200, m.subjectLong),
    message: z.string().trim().min(10, m.messageShort).max(5000, m.messageLong),
  });
}

export const contactSchema = makeContactSchema();

export type ContactInput = z.infer<typeof contactSchema>;

/** Minimum time a human needs to fill the form; faster submissions are bots. */
export const MIN_FILL_MS = 3000;
