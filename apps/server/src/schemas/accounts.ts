import { z } from "zod";

export const ConnectBodySchema = z.object({
  provider: z.literal("google"),
  includeOtherContacts: z.boolean().default(false),
});

export const AccountParamsSchema = z.object({ id: z.string().min(1).max(64) });

export const OauthCallbackQuerySchema = z.object({
  code: z.string().min(1).max(2048).optional(),
  state: z.string().min(1).max(256).optional(),
  error: z.string().max(256).optional(),
});
