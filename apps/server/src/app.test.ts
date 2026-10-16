import { Writable } from "node:stream";

import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ConflictError } from "@contact-fuse/core";

import { describeErrorSafely, registerErrorHandlers } from "./errors.ts";
import { buildLoggerOptions } from "./logger.ts";
import { SECURITY_HEADERS } from "./plugins/security.ts";
import { TEST_HOST, TEST_ORIGIN, buildTestApp, writeHeaders } from "./testing/build-test-app.ts";

async function appWithEchoRoute(overrides = {}) {
  const app = await buildTestApp(overrides);
  app.post("/api/v1/test-echo", async () => ({ ok: true }));
  return app;
}

describe("server", () => {
  it("reports health", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { host: TEST_HOST },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("sends security headers on every response", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { host: TEST_HOST },
    });
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(res.headers[name]).toBe(value);
    }
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("returns the standard error shape for unknown routes", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/nope",
      headers: { host: TEST_HOST },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });
});

describe("security guards", () => {
  it.each(["evil.example:4317", "127.0.0.1:9999", "192.168.1.20:4317", ""])(
    "rejects host %j (DNS rebinding / LAN access)",
    async (host) => {
      const app = await buildTestApp();
      const res = await app.inject({ method: "GET", url: "/api/health", headers: { host } });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("FORBIDDEN_REQUEST");
    },
  );

  it("accepts localhost as well as 127.0.0.1", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { host: "localhost:4317" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("rejects writes without an Origin header", async () => {
    const app = await appWithEchoRoute();
    const { origin: _origin, ...headers } = await writeHeaders(app);
    const res = await app.inject({ method: "POST", url: "/api/v1/test-echo", headers });
    expect(res.statusCode).toBe(403);
  });

  it("rejects writes from another website", async () => {
    const app = await appWithEchoRoute();
    const headers = { ...(await writeHeaders(app)), origin: "https://evil.example" };
    const res = await app.inject({ method: "POST", url: "/api/v1/test-echo", headers });
    expect(res.statusCode).toBe(403);
  });

  it.each([
    ["no token at all", (h: Record<string, string>) => ({ host: h.host, origin: h.origin })],
    ["header without cookie", (h: Record<string, string>) => ({ ...h, cookie: "" })],
    ["cookie without header", (h: Record<string, string>) => ({ ...h, "x-csrf-token": "" })],
    ["mismatched token", (h: Record<string, string>) => ({ ...h, "x-csrf-token": "forged" })],
  ])("rejects writes with %s", async (_name, mutate) => {
    const app = await appWithEchoRoute();
    const headers = mutate(await writeHeaders(app));
    const res = await app.inject({ method: "POST", url: "/api/v1/test-echo", headers });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("FORBIDDEN_REQUEST");
  });

  it("accepts writes with matching origin and CSRF token", async () => {
    const app = await appWithEchoRoute();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/test-echo",
      headers: await writeHeaders(app),
    });
    expect(res.statusCode).toBe(200);
  });

  it("accepts the Vite dev server origin only when configured", async () => {
    const devOrigin = "http://127.0.0.1:5173";
    const withDev = await appWithEchoRoute({ devUiOrigin: devOrigin });
    const ok = await withDev.inject({
      method: "POST",
      url: "/api/v1/test-echo",
      headers: { ...(await writeHeaders(withDev)), origin: devOrigin },
    });
    expect(ok.statusCode).toBe(200);

    const withoutDev = await appWithEchoRoute();
    const rejected = await withoutDev.inject({
      method: "POST",
      url: "/api/v1/test-echo",
      headers: { ...(await writeHeaders(withoutDev)), origin: devOrigin },
    });
    expect(rejected.statusCode).toBe(403);
  });

  it("sets the CSRF cookie as HttpOnly and SameSite=Strict", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/session",
      headers: { host: TEST_HOST },
    });
    const setCookie = String(res.headers["set-cookie"]);
    expect(setCookie).toMatch(/cf_csrf=[\w-]{43}/);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    expect(TEST_ORIGIN).toBe("http://127.0.0.1:4317");
  });
});

describe("error handler", () => {
  async function appThatThrows(error: unknown) {
    const app = Fastify({ logger: false });
    registerErrorHandlers(app);
    app.get("/boom", async () => {
      throw error;
    });
    return app;
  }

  it("returns code, message and details for ContactFuseError", async () => {
    const app = await appThatThrows(
      new ConflictError("RUN_IN_PROGRESS", "Another run is active", {
        details: { runId: "run_1" },
      }),
    );
    const res = await app.inject({ method: "GET", url: "/boom" });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: {
        code: "RUN_IN_PROGRESS",
        message: "Another run is active",
        details: { runId: "run_1" },
      },
    });
  });

  it("turns Zod errors into VALIDATION_FAILED with field paths only", async () => {
    const result = z.object({ email: z.email() }).safeParse({ email: "not-an-email" });
    const app = await appThatThrows(result.error);
    const res = await app.inject({ method: "GET", url: "/boom" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: {
        code: "VALIDATION_FAILED",
        message: "Request validation failed",
        details: { fields: "email" },
      },
    });
    expect(res.body).not.toContain("not-an-email");
  });

  it("hides unexpected errors behind INTERNAL_ERROR", async () => {
    const app = await appThatThrows(new Error("db password is hunter2"));
    const res = await app.inject({ method: "GET", url: "/boom" });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
    expect(res.body).not.toContain("hunter2");
  });
});

describe("describeErrorSafely", () => {
  it("keeps name, code and stack locations but drops messages and causes", () => {
    const cause = new Error("GET /v1/people?personFields=x token=ya29.secret asha@example.com");
    const error = new ConflictError("ETAG_MISMATCH", "skipped", { cause });
    const described = describeErrorSafely(error);
    expect(described).toMatchObject({
      name: "ConflictError",
      code: "ETAG_MISMATCH",
      causeName: "Error",
    });
    expect(described.stack).toMatch(/^\s*at /);
    expect(JSON.stringify(described)).not.toMatch(/ya29|asha|personFields|skipped/);
  });

  it("handles non-errors", () => {
    expect(describeErrorSafely("oops")).toEqual({ name: "string" });
  });
});

describe("logger", () => {
  it("redacts personal data and secrets", async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, done) {
        lines.push(String(chunk));
        done();
      },
    });
    const options = buildLoggerOptions({ logLevel: "info" });
    const app = Fastify({ logger: { ...options, stream } });
    app.log.info(
      {
        account: { email: "asha@example.com", displayName: "Asha Example" },
        tokens: { refreshToken: "1//secret", accessToken: "ya29.secret" },
        oauth: { code: "4/auth-code", clientSecret: "GOCSPX-secret" },
        item: { phone: "+1 555 0100", contact: { notes: "private" } },
      },
      "test",
    );
    await app.close();
    const output = lines.join("");
    for (const secret of [
      "asha@example.com",
      "Asha Example",
      "1//secret",
      "ya29.secret",
      "4/auth-code",
      "GOCSPX-secret",
      "+1 555 0100",
      "private",
    ]) {
      expect(output).not.toContain(secret);
    }
    expect(output).toContain("[redacted]");
  });
});
