import type { FastifyRequest, FastifyServerOptions } from "fastify";

import type { Config } from "./config.ts";

/**
 * Second line of defence against leaking personal data or secrets into logs. Code must already
 * avoid logging them (docs/standards/error-handling-and-logging.md#5-pii-and-secret-redaction).
 */
/** Fastify logger options without the `true`/`false` shorthand. */
export type LoggerOptions = Exclude<FastifyServerOptions["logger"], boolean | undefined>;

export const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.clientSecret",
  "*.code",
  "*.email",
  "*.phone",
  "*.displayName",
  "*.contact",
  "*.body",
];

export function buildLoggerOptions(config: Pick<Config, "logLevel">): LoggerOptions {
  return {
    level: config.logLevel,
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    serializers: {
      // Log the route template, never the concrete URL: query strings can carry codes or tokens.
      req: (req: FastifyRequest) => ({
        method: req.method,
        route: req.routeOptions.url ?? "unmatched",
      }),
    },
  };
}
