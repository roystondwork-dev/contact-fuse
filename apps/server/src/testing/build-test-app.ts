import type { FastifyInstance } from "fastify";

import { fixedClock, sequentialIds } from "@contact-fuse/core/testing";

import { buildApp, type AppDependencies } from "../app.ts";
import { createMemorySecretStore } from "../auth/secret-store.ts";
import { openDatabase } from "../db/client.ts";

export const TEST_PORT = 4317;
export const TEST_HOST = `127.0.0.1:${TEST_PORT}`;
export const TEST_ORIGIN = `http://${TEST_HOST}`;

/** App wired to an in-memory database, a fixed clock and sequential IDs. */
export async function buildTestApp(
  overrides: Partial<AppDependencies["config"]> = {},
  deps: Partial<Omit<AppDependencies, "config">> = {},
): Promise<FastifyInstance> {
  const { db } = openDatabase({ path: ":memory:" });
  return buildApp({
    config: { port: TEST_PORT, logLevel: "silent", ...overrides },
    db,
    clock: fixedClock(),
    ids: sequentialIds("acc"),
    secrets: createMemorySecretStore(),
    ...deps,
  });
}

/** Fetches a CSRF token and returns headers that pass the security checks for a write. */
export async function writeHeaders(app: FastifyInstance): Promise<Record<string, string>> {
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/session",
    headers: { host: TEST_HOST },
  });
  const { csrfToken } = res.json<{ csrfToken: string }>();
  return {
    host: TEST_HOST,
    origin: TEST_ORIGIN,
    "x-csrf-token": csrfToken,
    cookie: `cf_csrf=${csrfToken}`,
  };
}
