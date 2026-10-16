import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { apiErrorResponse, server } from "../test/server.ts";
import { ApiError, createApiClient } from "./api-client.ts";

const BASE = "http://127.0.0.1:4317";

function trackSessionCalls(tokens: string[]) {
  let calls = 0;
  server.use(
    http.get(`${BASE}/api/v1/session`, () => {
      const csrfToken = tokens[Math.min(calls, tokens.length - 1)] ?? "missing";
      calls += 1;
      return HttpResponse.json({ csrfToken });
    }),
  );
  return () => calls;
}

describe("createApiClient", () => {
  it("does not fetch a session or send a CSRF header on reads", async () => {
    const sessionCalls = trackSessionCalls(["token-a"]);
    let csrfHeader: string | null = "unset";
    server.use(
      http.get(`${BASE}/api/v1/accounts`, ({ request }) => {
        csrfHeader = request.headers.get("x-csrf-token");
        return HttpResponse.json({ items: [], nextCursor: null });
      }),
    );
    const client = createApiClient({ baseUrl: BASE });

    const result = await client.get("/api/v1/accounts");

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(csrfHeader).toBeNull();
    expect(sessionCalls()).toBe(0);
  });

  it("fetches the session once and sends x-csrf-token on every write", async () => {
    const sessionCalls = trackSessionCalls(["token-a"]);
    const seen: (string | null)[] = [];
    server.use(
      http.post(`${BASE}/api/v1/snapshots`, ({ request }) => {
        seen.push(request.headers.get("x-csrf-token"));
        return HttpResponse.json({ id: "snap-1" }, { status: 202 });
      }),
      http.delete(`${BASE}/api/v1/snapshots/snap-1`, ({ request }) => {
        seen.push(request.headers.get("x-csrf-token"));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = createApiClient({ baseUrl: BASE });

    const created = await client.post("/api/v1/snapshots", {});
    const deleted = await client.delete("/api/v1/snapshots/snap-1");

    expect(created).toEqual({ id: "snap-1" });
    expect(deleted).toBeUndefined();
    expect(seen).toEqual(["token-a", "token-a"]);
    expect(sessionCalls()).toBe(1);
  });

  it("sends JSON bodies with a content type", async () => {
    trackSessionCalls(["token-a"]);
    let received: unknown;
    let contentType: string | null = null;
    server.use(
      http.put(`${BASE}/api/v1/settings/google-client`, async ({ request }) => {
        contentType = request.headers.get("content-type");
        received = await request.json();
        return HttpResponse.json({ configured: true, clientId: "x.apps.googleusercontent.com" });
      }),
    );
    const client = createApiClient({ baseUrl: BASE });

    await client.put("/api/v1/settings/google-client", { clientId: "a", clientSecret: "b" });

    expect(contentType).toBe("application/json");
    expect(received).toEqual({ clientId: "a", clientSecret: "b" });
  });

  it("refreshes the session and retries once after 403 FORBIDDEN_REQUEST", async () => {
    const sessionCalls = trackSessionCalls(["stale-token", "fresh-token"]);
    const seen: (string | null)[] = [];
    server.use(
      http.post(`${BASE}/api/v1/snapshots`, ({ request }) => {
        const token = request.headers.get("x-csrf-token");
        seen.push(token);
        if (token !== "fresh-token") return apiErrorResponse(403, "FORBIDDEN_REQUEST");
        return HttpResponse.json({ id: "snap-1" }, { status: 202 });
      }),
    );
    const client = createApiClient({ baseUrl: BASE });

    const result = await client.post("/api/v1/snapshots", {});

    expect(result).toEqual({ id: "snap-1" });
    expect(seen).toEqual(["stale-token", "fresh-token"]);
    expect(sessionCalls()).toBe(2);
  });

  it("gives up after one retry when the write is still forbidden", async () => {
    const sessionCalls = trackSessionCalls(["token-a", "token-b", "token-c"]);
    let attempts = 0;
    server.use(
      http.post(`${BASE}/api/v1/snapshots`, () => {
        attempts += 1;
        return apiErrorResponse(403, "FORBIDDEN_REQUEST");
      }),
    );
    const client = createApiClient({ baseUrl: BASE });

    const error = await client.post("/api/v1/snapshots", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, code: "FORBIDDEN_REQUEST" });
    expect(attempts).toBe(2);
    expect(sessionCalls()).toBe(2);
  });

  it("does not retry other 403 errors or reads", async () => {
    let attempts = 0;
    server.use(
      http.get(`${BASE}/api/v1/accounts`, () => {
        attempts += 1;
        return apiErrorResponse(403, "FORBIDDEN_REQUEST");
      }),
    );
    const client = createApiClient({ baseUrl: BASE });

    await expect(client.get("/api/v1/accounts")).rejects.toMatchObject({ status: 403 });
    expect(attempts).toBe(1);
  });

  it("throws a typed ApiError with code and details, without the server message", async () => {
    trackSessionCalls(["token-a"]);
    server.use(
      http.put(`${BASE}/api/v1/settings/google-client`, () =>
        apiErrorResponse(400, "VALIDATION_FAILED", { fields: "clientId" }),
      ),
    );
    const client = createApiClient({ baseUrl: BASE });

    const error = await client
      .put("/api/v1/settings/google-client", { clientId: "bad", clientSecret: "x" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_FAILED",
      details: { fields: "clientId" },
    });
    expect((error as ApiError).message).not.toContain("server message");
  });

  it("maps a network failure to SERVER_UNREACHABLE", async () => {
    server.use(http.get(`${BASE}/api/v1/accounts`, () => HttpResponse.error()));
    const client = createApiClient({ baseUrl: BASE });

    await expect(client.get("/api/v1/accounts")).rejects.toMatchObject({
      status: 0,
      code: "SERVER_UNREACHABLE",
    });
  });

  it("maps a non-JSON error body to INVALID_RESPONSE", async () => {
    server.use(
      http.get(`${BASE}/api/v1/accounts`, () => new HttpResponse("Bad gateway", { status: 502 })),
    );
    const client = createApiClient({ baseUrl: BASE });

    await expect(client.get("/api/v1/accounts")).rejects.toMatchObject({
      status: 502,
      code: "INVALID_RESPONSE",
    });
  });
});
