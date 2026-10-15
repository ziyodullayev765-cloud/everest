import { z } from "zod";

/** Shared by the client form and the server action. Messages are in English (public UI). */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name (at least 2 characters)").max(120, "Name is too long"),
  email: z.string().trim().email("Please enter a valid email address").max(254),
  subject: z.string().trim().max(200, "Subject is too long"),
  message: z
    .string()
    .trim()
    .min(10, "Message should be at least 10 characters")
    .max(5000, "Message is too long (5000 characters max)"),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Minimum time a human needs to fill the form; faster submissions are bots. */
export const MIN_FILL_MS = 3000;
