import type { FastifyInstance } from "fastify";
import { HttpResponse, http } from "msw/http";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { GOOGLE_SCOPES } from "../auth/google-oauth.ts";
import { createMemorySecretStore } from "../auth/secret-store.ts";
import { TEST_HOST, buildTestApp, writeHeaders } from "../testing/build-test-app.ts";

// Synthetic values only.
const CLIENT_ID = "1234-test.apps.googleusercontent.com";
const CLIENT_SECRET = "test-client-secret";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const NOW_MS = Date.parse("2026-01-01T00:00:00.000Z");

const google = setupServer();
beforeAll(() => google.listen({ onUnhandledFrame: "error" }));
afterEach(() => google.resetHandlers());
afterAll(() => google.close());

function fakeIdToken(claims: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256" })}.${encode({
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "google-sub-1",
    email: "person.one@example.com",
    email_verified: true,
    exp: NOW_MS / 1000 + 3600,
    ...claims,
  })}.signature`;
}

interface TokenEndpointOptions {
  claims?: Record<string, unknown>;
  scope?: string;
  refreshToken?: string;
  onRequest?: (body: URLSearchParams) => void;
}

function mockTokenEndpoint(options: TokenEndpointOptions = {}): void {
  google.use(
    http.post(TOKEN_URL, async ({ request }) => {
      options.onRequest?.(new URLSearchParams(await request.text()));
      return HttpResponse.json({
        access_token: "test-access-token",
        refresh_token: options.refreshToken ?? "test-refresh-token-1",
        id_token: fakeIdToken(options.claims ?? {}),
        scope: options.scope ?? `openid email ${GOOGLE_SCOPES.contactsRead}`,
        expires_in: 3599,
        token_type: "Bearer",
      });
    }),
  );
}

interface Harness {
  app: FastifyInstance;
  secrets: ReturnType<typeof createMemorySecretStore>;
  clock: { now(): Date; advance(ms: number): void };
}

async function setup(): Promise<Harness> {
  let now = NOW_MS;
  const clock = { now: () => new Date(now), advance: (ms: number) => void (now += ms) };
  const secrets = createMemorySecretStore();
  const app = await buildTestApp({}, { secrets, clock });
  return { app, secrets, clock };
}

async function configureClient(app: FastifyInstance): Promise<void> {
  const res = await app.inject({
    method: "PUT",
    url: "/api/v1/settings/google-client",
    headers: await writeHeaders(app),
    payload: { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET },
  });
  expect(res.statusCode).toBe(200);
}

async function startConnect(app: FastifyInstance, includeOtherContacts = false): Promise<URL> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/accounts/connect",
    headers: await writeHeaders(app),
    payload: { provider: "google", includeOtherContacts },
  });
  expect(res.statusCode).toBe(200);
  return new URL(res.json<{ authorizationUrl: string }>().authorizationUrl);
}

function callback(app: FastifyInstance, query: string) {
  return app.inject({
    method: "GET",
    url: `/oauth/callback?${query}`,
    headers: { host: TEST_HOST },
  });
}

async function listAccounts(app: FastifyInstance) {
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/accounts",
    headers: { host: TEST_HOST },
  });
  return res.json<{ items: Record<string, unknown>[]; nextCursor: null }>();
}

async function connectAccount(h: Harness, options: TokenEndpointOptions = {}) {
  mockTokenEndpoint(options);
  const url = await startConnect(h.app);
  return callback(h.app, `code=test-code&state=${url.searchParams.get("state")}`);
}

describe("Google OAuth client settings", () => {
  it("rejects a client ID that is not a Google client ID", async () => {
    const { app } = await setup();
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/settings/google-client",
      headers: await writeHeaders(app),
      payload: { clientId: "not-google", clientSecret: CLIENT_SECRET },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toEqual({
      code: "VALIDATION_FAILED",
      message: "Request validation failed",
      details: { fields: "clientId" },
    });
  });

  it("stores the secret only in the secret store and never returns it", async () => {
    const { app, secrets } = await setup();
    const before = await app.inject({
      method: "GET",
      url: "/api/v1/settings/google-client",
      headers: { host: TEST_HOST },
    });
    expect(before.json()).toEqual({ configured: false });

    await configureClient(app);
    const after = await app.inject({
      method: "GET",
      url: "/api/v1/settings/google-client",
      headers: { host: TEST_HOST },
    });
    expect(after.json()).toEqual({ configured: true, clientId: CLIENT_ID });
    expect(after.body).not.toContain(CLIENT_SECRET);
    expect(await secrets.get("google-oauth-client-secret")).toBe(CLIENT_SECRET);
  });

  it("removes the client", async () => {
    const { app, secrets } = await setup();
    await configureClient(app);
    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/settings/google-client",
      headers: await writeHeaders(app),
    });
    expect(res.statusCode).toBe(204);
    expect(secrets.keys()).toEqual([]);
  });
});

describe("connecting an account", () => {
  it("needs a configured OAuth client", async () => {
    const { app } = await setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/accounts/connect",
      headers: await writeHeaders(app),
      payload: { provider: "google" },
    });
    expect(res.statusCode).toBe(412);
    expect(res.json().error.code).toBe("OAUTH_CLIENT_MISSING");
  });

  it("builds a PKCE authorization URL with read-only scopes and a loopback redirect", async () => {
    const { app } = await setup();
    await configureClient(app);
    const url = await startConnect(app);
    const params = url.searchParams;
    expect(url.origin).toBe("https://accounts.google.com");
    expect(params.get("client_id")).toBe(CLIENT_ID);
    expect(params.get("redirect_uri")).toBe("http://127.0.0.1:4317/oauth/callback");
    expect(params.get("response_type")).toBe("code");
    expect(params.get("access_type")).toBe("offline");
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("code_challenge")).toMatch(/^[\w-]{43}$/);
    expect(params.get("state")).toMatch(/^[\w-]{43}$/);
    const scopes = (params.get("scope") ?? "").split(" ");
    expect(scopes).toEqual(["openid", "email", GOOGLE_SCOPES.contactsRead]);
    expect(scopes).not.toContain("https://www.googleapis.com/auth/contacts");
  });

  it("asks for Other contacts only when enabled", async () => {
    const { app } = await setup();
    await configureClient(app);
    const url = await startConnect(app, true);
    expect(url.searchParams.get("scope")).toContain(GOOGLE_SCOPES.otherContactsRead);
  });

  it("exchanges the code with the PKCE verifier and stores the token in the secret store", async () => {
    const h = await setup();
    await configureClient(h.app);
    let tokenRequest: URLSearchParams | undefined;
    const res = await connectAccount(h, { onRequest: (body) => (tokenRequest = body) });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain("Account connected");
    expect(tokenRequest?.get("code")).toBe("test-code");
    expect(tokenRequest?.get("code_verifier")).toMatch(/^[\w~.-]{43,128}$/);

    const { items } = await listAccounts(h.app);
    expect(items).toEqual([
      {
        id: "acc_1",
        provider: "google",
        email: "person.one@example.com",
        isMain: false,
        status: "connected",
        includesOtherContacts: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(await h.secrets.get("refresh-token:acc_1")).toBe("test-refresh-token-1");
  });

  it("reconnects an existing Google account instead of adding a duplicate", async () => {
    const h = await setup();
    await configureClient(h.app);
    await connectAccount(h);
    await connectAccount(h, {
      refreshToken: "test-refresh-token-2",
      scope: `openid email ${GOOGLE_SCOPES.contactsRead} ${GOOGLE_SCOPES.otherContactsRead}`,
    });
    const { items } = await listAccounts(h.app);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "acc_1", includesOtherContacts: true });
    expect(await h.secrets.get("refresh-token:acc_1")).toBe("test-refresh-token-2");
  });

  it("refuses a reused state", async () => {
    const h = await setup();
    await configureClient(h.app);
    mockTokenEndpoint();
    const url = await startConnect(h.app);
    const query = `code=test-code&state=${url.searchParams.get("state")}`;
    expect((await callback(h.app, query)).statusCode).toBe(200);
    const replay = await callback(h.app, query);
    expect(replay.statusCode).toBe(400);
    expect(replay.body).toContain("expired or was already used");
  });

  it("refuses a state older than 10 minutes", async () => {
    const h = await setup();
    await configureClient(h.app);
    mockTokenEndpoint();
    const url = await startConnect(h.app);
    h.clock.advance(10 * 60 * 1000 + 1);
    const res = await callback(h.app, `code=test-code&state=${url.searchParams.get("state")}`);
    expect(res.statusCode).toBe(400);
    expect((await listAccounts(h.app)).items).toEqual([]);
  });

  it.each([
    ["another app's ID token", { aud: "someone-else.apps.googleusercontent.com" }],
    ["a non-Google issuer", { iss: "https://evil.example" }],
    ["an expired ID token", { exp: NOW_MS / 1000 - 1 }],
    ["an unverified email", { email_verified: false }],
  ])("rejects %s", async (_name, claims) => {
    const h = await setup();
    await configureClient(h.app);
    const res = await connectAccount(h, { claims });
    expect(res.statusCode).toBe(400);
    expect((await listAccounts(h.app)).items).toEqual([]);
    expect(h.secrets.keys()).toEqual(["google-oauth-client-secret"]);
  });

  it("explains what to do when the contacts permission was unticked", async () => {
    const h = await setup();
    await configureClient(h.app);
    const res = await connectAccount(h, { scope: "openid email" });
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain("needs permission to read your contacts");
    expect((await listAccounts(h.app)).items).toEqual([]);
  });

  it("shows a cancelled page when the user denies consent", async () => {
    const { app } = await setup();
    const res = await callback(app, "error=access_denied&state=x");
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain("Connection cancelled");
  });

  it("never echoes request values into the callback page", async () => {
    const { app } = await setup();
    const res = await callback(
      app,
      `code=x&state=${encodeURIComponent("<script>alert(1)</script>")}`,
    );
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toContain("<script>alert");
    expect(res.headers["cache-control"]).toBe("no-store");
  });
});

describe("disconnecting an account", () => {
  it("revokes the token at Google, deletes it locally and keeps the account row", async () => {
    const h = await setup();
    await configureClient(h.app);
    await connectAccount(h);
    let revoked: string | null = null;
    google.use(
      http.post(REVOKE_URL, async ({ request }) => {
        revoked =
          new URLSearchParams(await request.text()).get("token") ??
          new URL(request.url).searchParams.get("token");
        return HttpResponse.json({});
      }),
    );

    const res = await h.app.inject({
      method: "DELETE",
      url: "/api/v1/accounts/acc_1",
      headers: await writeHeaders(h.app),
    });
    expect(res.statusCode).toBe(204);
    expect(revoked).toBe("test-refresh-token-1");
    expect(await h.secrets.get("refresh-token:acc_1")).toBeUndefined();
    expect((await listAccounts(h.app)).items[0]).toMatchObject({
      id: "acc_1",
      status: "disconnected",
    });
  });

  it("still removes the local token when Google's revoke endpoint fails", async () => {
    const h = await setup();
    await configureClient(h.app);
    await connectAccount(h);
    google.use(http.post(REVOKE_URL, () => new HttpResponse(null, { status: 503 })));
    const res = await h.app.inject({
      method: "DELETE",
      url: "/api/v1/accounts/acc_1",
      headers: await writeHeaders(h.app),
    });
    expect(res.statusCode).toBe(204);
    expect(await h.secrets.get("refresh-token:acc_1")).toBeUndefined();
  });

  it("returns ACCOUNT_NOT_FOUND for an unknown account", async () => {
    const { app } = await setup();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/accounts/missing",
      headers: await writeHeaders(app),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("ACCOUNT_NOT_FOUND");
  });
});
