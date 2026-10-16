import { z } from "zod";

export const GoogleClientBodySchema = z.object({
  clientId: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/\.apps\.googleusercontent\.com$/),
  clientSecret: z.string().trim().min(1).max(255),
});
