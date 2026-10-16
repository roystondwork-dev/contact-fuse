import { existsSync } from "node:fs";
import { join } from "node:path";

import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";

/**
 * Serves the built web UI (apps/web/dist) so the whole app runs from one loopback origin.
 * Unknown non-API GET requests get index.html so client-side routes work on reload.
 */
export function hasWebUiBuild(uiDir: string | undefined): uiDir is string {
  return uiDir !== undefined && existsSync(join(uiDir, "index.html"));
}

export async function registerWebUi(
  app: FastifyInstance,
  uiDir: string | undefined,
): Promise<void> {
  if (!hasWebUiBuild(uiDir)) {
    app.log.info("web UI build not found, serving the API only");
    return;
  }
  await app.register(fastifyStatic, { root: uiDir, index: ["index.html"], wildcard: false });
  app.log.info("serving web UI");
}

/** True for browser navigations that should fall back to the single-page app. */
export function isSpaNavigation(method: string, url: string, accept: string | undefined): boolean {
  return (
    method === "GET" &&
    !url.startsWith("/api/") &&
    !url.startsWith("/oauth/") &&
    (accept ?? "").includes("text/html")
  );
}
