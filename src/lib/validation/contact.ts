import { z } from "zod";

/** Shared by the client form and the server action. Messages are in Uzbek (public UI). */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Ismingizni kiriting (kamida 2 belgi)").max(120, "Ism juda uzun"),
  email: z.string().trim().email("To‘g‘ri elektron pochta manzilini kiriting").max(254),
  subject: z.string().trim().max(200, "Mavzu juda uzun"),
  message: z
    .string()
    .trim()
    .min(10, "Xabar kamida 10 belgidan iborat bo‘lsin")
    .max(5000, "Xabar juda uzun (ko‘pi bilan 5000 belgi)"),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Minimum time a human needs to fill the form; faster submissions are bots. */
export const MIN_FILL_MS = 3000;
