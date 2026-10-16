import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { CSRF_TOKEN } from "./fixtures.ts";

/** Default handlers: configured Google client, no accounts, no backups. Tests override per case. */
export const defaultHandlers = [
  http.get("/api/v1/session", () => HttpResponse.json({ csrfToken: CSRF_TOKEN })),
  http.get("/api/v1/settings/google-client", () =>
    HttpResponse.json({ configured: true, clientId: "1234-test.apps.googleusercontent.com" }),
  ),
  http.get("/api/v1/accounts", () => HttpResponse.json({ items: [], nextCursor: null })),
  http.get("/api/v1/snapshots", () => HttpResponse.json({ items: [], nextCursor: null })),
];

export const server = setupServer(...defaultHandlers);

export function apiErrorResponse(status: number, code: string, details?: Record<string, unknown>) {
  return HttpResponse.json(
    {
      error: {
        code,
        message: "server message that must never be shown",
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
}
