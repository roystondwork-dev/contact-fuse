import envPaths from "env-paths";
import { z } from "zod";

import { ValidationError } from "@contact-fuse/core";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

const EnvSchema = z.object({
  CONTACT_FUSE_PORT: z.coerce.number().int().min(1).max(65535).default(4317),
  CONTACT_FUSE_DATA_DIR: z.string().min(1).optional(),
  CONTACT_FUSE_LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
  /** ISO 3166 region used to read phone numbers without a country code. */
  CONTACT_FUSE_DEFAULT_REGION: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  /** Development only: origin of the Vite dev server allowed to call the API. */
  CONTACT_FUSE_DEV_UI_ORIGIN: z.url().optional(),
});

export interface Config {
  host: "127.0.0.1";
  port: number;
  dataDir: string;
  logLevel: (typeof LOG_LEVELS)[number];
  defaultRegion?: string;
  devUiOrigin?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new ValidationError("VALIDATION_FAILED", "Invalid CONTACT_FUSE_* environment variables", {
      details: { fields: parsed.error.issues.map((issue) => issue.path.join(".")).join(",") },
    });
  }
  const e = parsed.data;
  return {
    // Loopback only, never configurable: contact data must not be reachable from the network.
    host: "127.0.0.1",
    port: e.CONTACT_FUSE_PORT,
    dataDir: e.CONTACT_FUSE_DATA_DIR ?? envPaths("contact-fuse", { suffix: "" }).data,
    logLevel: e.CONTACT_FUSE_LOG_LEVEL,
    ...(e.CONTACT_FUSE_DEFAULT_REGION ? { defaultRegion: e.CONTACT_FUSE_DEFAULT_REGION } : {}),
    ...(e.CONTACT_FUSE_DEV_UI_ORIGIN ? { devUiOrigin: e.CONTACT_FUSE_DEV_UI_ORIGIN } : {}),
  };
}
