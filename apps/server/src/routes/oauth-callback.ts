import type { FastifyInstance } from "fastify";

import { isContactFuseError } from "@contact-fuse/core";

import { OauthCallbackQuerySchema } from "../schemas/accounts.ts";
import type { AccountService } from "../services/account-service.ts";
import { OAUTH_CALLBACK_PATH } from "./accounts.ts";

/**
 * Google redirects the browser tab here after consent. This is a page for people, not a JSON API.
 * It never echoes query values or account details back into the HTML.
 */
export function registerOauthCallbackRoute(
  app: FastifyInstance,
  deps: { accounts: AccountService },
): void {
  app.get(OAUTH_CALLBACK_PATH, async (request, reply) => {
    void reply.type("text/html; charset=utf-8").header("cache-control", "no-store");
    const query = OauthCallbackQuerySchema.safeParse(request.query);

    if (!query.success || query.data.error || !query.data.code || !query.data.state) {
      const denied = query.success && query.data.error === "access_denied";
      request.log.info({ denied }, "oauth callback without code");
      return reply
        .status(400)
        .send(
          renderPage(
            denied ? "Connection cancelled" : "Connection failed",
            denied
              ? "You cancelled the Google sign-in. Nothing was changed. You can close this tab and try again from contact-fuse."
              : "Google did not complete the sign-in. Nothing was changed. Close this tab and try again from contact-fuse.",
          ),
        );
    }

    try {
      await deps.accounts.completeConnect({ code: query.data.code, state: query.data.state });
      return renderPage(
        "Account connected",
        "Your Google account is connected to contact-fuse. You can close this tab and go back to the app.",
      );
    } catch (error) {
      const code = isContactFuseError(error) ? error.code : "INTERNAL_ERROR";
      request.log.warn({ code }, "oauth callback failed");
      const message =
        code === "PROVIDER_PERMISSION_DENIED"
          ? "contact-fuse needs permission to read your contacts. Nothing was changed. Close this tab and connect again, leaving the contacts box ticked."
          : "The sign-in link expired or was already used. Nothing was changed. Close this tab and connect again from contact-fuse.";
      return reply.status(400).send(renderPage("Connection failed", message));
    }
  });
}

function renderPage(title: string, message: string): string {
  // Static strings only: nothing from the request is interpolated.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · contact-fuse</title>
<style>
  :root { color-scheme: light dark; --bg: #ffffff; --text: #18181b; --muted: #52525b; --primary: #5b45e6; }
  @media (prefers-color-scheme: dark) { :root { --bg: #101016; --text: #f4f4f5; --muted: #a1a1aa; --primary: #8b7ffb; } }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--text);
         font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; padding: 16px; box-sizing: border-box; }
  main { max-width: 32rem; }
  h1 { font-size: 1.5rem; margin: 0 0 0.5rem; color: var(--primary); }
  p { margin: 0; color: var(--muted); }
</style>
</head>
<body><main><h1>${title}</h1><p>${message}</p></main></body>
</html>`;
}
