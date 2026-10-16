import { randomBytes, timingSafeEqual } from "node:crypto";

import cookie from "@fastify/cookie";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { AuthError } from "@contact-fuse/core";

/**
 * Local server hardening (docs/architecture/security-and-privacy.md#local-server-hardening):
 * any website open in the user's browser can send requests to 127.0.0.1, so every request is
 * checked here before it reaches a route.
 */
export const CSRF_COOKIE = "cf_csrf";
export const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const LOOPBACK_HOSTNAMES = ["127.0.0.1", "localhost"];

export const SECURITY_HEADERS = {
  "content-security-policy":
    "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "x-frame-options": "DENY",
} as const;

export interface SecurityOptions {
  /** The port actually listened on (it can differ from the configured one if that was busy). */
  getPort: () => number;
  /** Extra allowed origin for the Vite dev server, development only. */
  devUiOrigin?: string;
}

export async function registerSecurity(
  app: FastifyInstance,
  options: SecurityOptions,
): Promise<void> {
  await app.register(cookie);

  const allowedHosts = (): Set<string> =>
    new Set(LOOPBACK_HOSTNAMES.map((hostname) => `${hostname}:${options.getPort()}`));
  const allowedOrigins = (): Set<string> => {
    const origins = new Set([...allowedHosts()].map((host) => `http://${host}`));
    if (options.devUiOrigin) origins.add(options.devUiOrigin);
    return origins;
  };

  app.addHook("onRequest", async (request) => {
    // Host allowlist defeats DNS rebinding (evil.example resolving to 127.0.0.1).
    if (!allowedHosts().has(request.headers.host ?? "")) {
      throw new AuthError("FORBIDDEN_REQUEST", "Host not allowed");
    }
    if (SAFE_METHODS.has(request.method)) return;

    const origin = request.headers.origin;
    if (!origin || !allowedOrigins().has(origin)) {
      throw new AuthError("FORBIDDEN_REQUEST", "Origin not allowed");
    }
    if (!hasValidCsrfToken(request)) {
      throw new AuthError("FORBIDDEN_REQUEST", "Missing or invalid CSRF token");
    }
  });

  app.addHook("onSend", async (_request, reply) => {
    void reply.headers(SECURITY_HEADERS);
  });

  // The UI calls this once on load, then sends the token back in the x-csrf-token header.
  // Other websites cannot read this response (no CORS headers), so they cannot learn the token.
  app.get("/api/v1/session", async (_request, reply) => {
    const csrfToken = randomBytes(32).toString("base64url");
    void reply.setCookie(CSRF_COOKIE, csrfToken, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
    });
    return { csrfToken };
  });
}

function hasValidCsrfToken(request: FastifyRequest): boolean {
  const header = request.headers[CSRF_HEADER];
  const cookieValue = request.cookies[CSRF_COOKIE];
  if (typeof header !== "string" || !cookieValue) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(cookieValue);
  return a.length === b.length && timingSafeEqual(a, b);
}
