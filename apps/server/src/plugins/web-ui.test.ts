import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { TEST_HOST, buildTestApp } from "../testing/build-test-app.ts";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fakeUiBuild(): string {
  const dir = mkdtempSync(join(tmpdir(), "contact-fuse-ui-"));
  dirs.push(dir);
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "index.html"), "<!doctype html><title>contact-fuse</title>");
  writeFileSync(join(dir, "assets", "app.js"), "console.log('ui')");
  return dir;
}

const html = { host: TEST_HOST, accept: "text/html,application/xhtml+xml" };

describe("web UI serving", () => {
  it("serves index.html, assets and client-side routes", async () => {
    const app = await buildTestApp({ uiDir: fakeUiBuild() });
    const root = await app.inject({ method: "GET", url: "/", headers: html });
    expect(root.statusCode).toBe(200);
    expect(root.body).toContain("<title>contact-fuse</title>");
    expect(root.headers["content-security-policy"]).toContain("default-src 'self'");

    const asset = await app.inject({
      method: "GET",
      url: "/assets/app.js",
      headers: { host: TEST_HOST },
    });
    expect(asset.statusCode).toBe(200);

    const deepLink = await app.inject({ method: "GET", url: "/backups", headers: html });
    expect(deepLink.statusCode).toBe(200);
    expect(deepLink.body).toContain("<title>contact-fuse</title>");
  });

  it("keeps JSON 404s for API routes and non-HTML requests", async () => {
    const app = await buildTestApp({ uiDir: fakeUiBuild() });
    const api = await app.inject({ method: "GET", url: "/api/v1/nope", headers: html });
    expect(api.statusCode).toBe(404);
    expect(api.json().error.code).toBe("NOT_FOUND");
    const asset = await app.inject({
      method: "GET",
      url: "/assets/missing.js",
      headers: { host: TEST_HOST },
    });
    expect(asset.statusCode).toBe(404);
  });

  it("serves only the API when there is no UI build", async () => {
    const app = await buildTestApp({ uiDir: join(tmpdir(), "does-not-exist") });
    const root = await app.inject({ method: "GET", url: "/", headers: html });
    expect(root.statusCode).toBe(404);
  });

  it("still applies the host guard to UI files", async () => {
    const app = await buildTestApp({ uiDir: fakeUiBuild() });
    const res = await app.inject({
      method: "GET",
      url: "/",
      headers: { ...html, host: "evil.example:4317" },
    });
    expect(res.statusCode).toBe(403);
  });
});
