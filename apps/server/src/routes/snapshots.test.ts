import { mkdtempSync, readdirSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FastifyInstance } from "fastify";
import { HttpResponse, http } from "msw/http";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { AuthError, ProviderError, type AccountId, type ProviderContact } from "@contact-fuse/core";
import { buildContact } from "@contact-fuse/core/testing";
import { GOOGLE_CAPABILITIES } from "@contact-fuse/provider-google";

import type { GoogleOauth } from "../auth/google-oauth.ts";
import { createMemorySecretStore } from "../auth/secret-store.ts";
import type { ProviderFactory } from "../services/snapshot-service.ts";
import { TEST_HOST, buildTestApp, writeHeaders } from "../testing/build-test-app.ts";

const google = setupServer(
  http.post("https://oauth2.googleapis.com/revoke", () => HttpResponse.json({})),
);
beforeAll(() => google.listen({ onUnhandledFrame: "error" }));
afterAll(() => google.close());

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function contactsFor(accountId: string, count: number): ProviderContact[] {
  return Array.from({ length: count }, (_, i) => ({
    contact: buildContact({
      ref: { accountId: accountId as AccountId, resourceId: `people/c${i}`, version: `etag-${i}` },
      displayName: `Test Person ${i}`,
      emails: [{ value: `person${i}@example.com`, label: "home" }],
      phones: [{ value: `+1 555-01${String(i).padStart(2, "0")}`, label: "mobile" }],
      notes: "a;b,c",
    }),
    raw: { resourceName: `people/c${i}`, etag: `etag-${i}` },
    source: "contacts",
  }));
}

/** A provider per account: returns synthetic contacts or throws. */
type Behaviour = number | Error | Promise<number>;

function fakeProviders(behaviour: Record<string, Behaviour>): ProviderFactory {
  const unused = async (): Promise<never> => {
    throw new Error("not used by backups");
  };
  return ({ accountId }) => ({
    id: "google",
    capabilities: GOOGLE_CAPABILITIES,
    getAccountInfo: unused,
    listLabels: unused,
    createContacts: unused,
    updateContacts: unused,
    deleteContacts: unused,
    ensureLabel: unused,
    addToLabel: unused,
    listContacts: async (options) => {
      const value = await behaviour[accountId];
      if (value instanceof Error) throw value;
      options?.onProgress?.(value ?? 0);
      return {
        contacts: contactsFor(accountId, value ?? 0),
        deletedResourceIds: [],
        fullResync: false,
      };
    },
  });
}

/** Bypasses the real OAuth flow: accounts are created by a fake that "completes" any state. */
function fakeOauth(): GoogleOauth & { next(sub: string): void } {
  let sub = "sub-1";
  return {
    next: (value) => void (sub = value),
    createAuthorizationUrl: async () => "https://accounts.google.com/o/oauth2/v2/auth?state=s",
    completeAuthorization: async () => ({
      subject: sub,
      email: `${sub}@example.com`,
      refreshToken: `token-${sub}`,
      grantedScopes: ["openid", "email", "https://www.googleapis.com/auth/contacts.readonly"],
    }),
    revoke: async () => {},
    createAuthorizedClient: () => ({}) as never,
  };
}

async function setup(options: {
  providers: Record<string, Behaviour>;
  accounts?: number;
  dataDir?: string;
}) {
  const oauth = fakeOauth();
  const secrets = createMemorySecretStore();
  const app = await buildTestApp(options.dataDir ? { dataDir: options.dataDir } : {}, {
    oauth,
    secrets,
    createProvider: fakeProviders(options.providers),
  });
  const headers = await writeHeaders(app);
  await app.inject({
    method: "PUT",
    url: "/api/v1/settings/google-client",
    headers,
    payload: { clientId: "1-test.apps.googleusercontent.com", clientSecret: "test-secret" },
  });
  for (let i = 1; i <= (options.accounts ?? 2); i += 1) {
    oauth.next(`sub-${i}`);
    await app.inject({
      method: "GET",
      url: "/oauth/callback?code=c&state=s",
      headers: { host: TEST_HOST },
    });
  }
  return { app, headers, secrets };
}

async function createSnapshot(app: FastifyInstance, headers: Record<string, string>) {
  return app.inject({ method: "POST", url: "/api/v1/snapshots", headers, payload: {} });
}

async function waitForSnapshot(app: FastifyInstance, id: string) {
  for (let i = 0; i < 1000; i += 1) {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/snapshots/${id}`,
      headers: { host: TEST_HOST },
    });
    const body = res.json<{ status: string }>();
    if (body.status !== "running") return body as Record<string, unknown>;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("snapshot did not finish");
}

describe("snapshots", () => {
  it("backs up every connected account and reports per-account counts", async () => {
    const { app, headers } = await setup({ providers: { acc_1: 3, acc_2: 2 } });
    const res = await createSnapshot(app, headers);
    expect(res.statusCode).toBe(202);
    const started = res.json<{ id: string; status: string }>();
    expect(started.status).toBe("running");
    expect(res.headers.location).toBe(`/api/v1/snapshots/${started.id}`);

    const done = await waitForSnapshot(app, started.id);
    expect(done).toMatchObject({
      status: "completed",
      contactCount: 5,
      accountCount: 2,
      accounts: [
        { accountId: "acc_1", email: "sub-1@example.com", contactCount: 3 },
        { accountId: "acc_2", email: "sub-2@example.com", contactCount: 2 },
      ],
    });
    const accounts = await app.inject({
      method: "GET",
      url: "/api/v1/accounts",
      headers: { host: TEST_HOST },
    });
    expect(accounts.json().items[0].lastSyncedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("handles the M1 exit-criteria scale: 3 accounts, 6,000 contacts", async () => {
    const { app, headers } = await setup({
      providers: { acc_1: 3000, acc_2: 2000, acc_3: 1000 },
      accounts: 3,
    });
    const started = Date.now();
    const done = await waitForSnapshot(app, (await createSnapshot(app, headers)).json().id);
    expect(done).toMatchObject({ status: "completed", contactCount: 6000, accountCount: 3 });
    const vcf = await app.inject({
      method: "GET",
      url: `/api/v1/snapshots/${String(done.id)}/export?format=vcf`,
      headers: { host: TEST_HOST },
    });
    expect(vcf.body.match(/BEGIN:VCARD/g)).toHaveLength(6000);
    // Generous bound: catches accidental quadratic behaviour, not micro-performance.
    expect(Date.now() - started).toBeLessThan(15_000);
  });

  it("needs at least one connected account", async () => {
    const { app, headers } = await setup({ providers: {}, accounts: 0 });
    const res = await createSnapshot(app, headers);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("AUTH_REQUIRED");
  });

  it("allows only one running backup at a time", async () => {
    let release: (count: number) => void = () => {};
    const gate = new Promise<number>((resolve) => (release = resolve));
    const { app, headers } = await setup({ providers: { acc_1: gate }, accounts: 1 });
    const first = await createSnapshot(app, headers);
    const second = await createSnapshot(app, headers);
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe("RUN_IN_PROGRESS");

    const running = await app.inject({
      method: "GET",
      url: `/api/v1/snapshots/${first.json().id}`,
      headers: { host: TEST_HOST },
    });
    expect(running.json()).toMatchObject({ status: "running", progress: { fetched: 0 } });
    const blockedDelete = await app.inject({
      method: "POST",
      url: "/api/v1/local-data/delete",
      headers,
      payload: { confirm: "DELETE" },
    });
    expect(blockedDelete.statusCode).toBe(409);

    release(1);
    expect(await waitForSnapshot(app, first.json().id)).toMatchObject({ status: "completed" });
  });

  it("fails and marks the account for reconnecting when its token expired", async () => {
    const { app, headers } = await setup({
      providers: { acc_1: 2, acc_2: new AuthError("TOKEN_EXPIRED", "expired") },
    });
    const done = await waitForSnapshot(app, (await createSnapshot(app, headers)).json().id);
    expect(done).toMatchObject({ status: "failed", errorCode: "TOKEN_EXPIRED" });
    const accounts = await app.inject({
      method: "GET",
      url: "/api/v1/accounts",
      headers: { host: TEST_HOST },
    });
    expect(accounts.json().items.map((a: { status: string }) => a.status)).toEqual([
      "connected",
      "needs-reauth",
    ]);
  });

  it("records provider failures by code", async () => {
    const { app, headers } = await setup({
      providers: { acc_1: new ProviderError("PROVIDER_QUOTA_EXCEEDED", "quota") },
      accounts: 1,
    });
    const done = await waitForSnapshot(app, (await createSnapshot(app, headers)).json().id);
    expect(done).toMatchObject({
      status: "failed",
      errorCode: "PROVIDER_QUOTA_EXCEEDED",
      contactCount: 0,
    });
  });

  it("lists newest first and deletes", async () => {
    const { app, headers } = await setup({ providers: { acc_1: 1 }, accounts: 1 });
    const a = (await createSnapshot(app, headers)).json().id;
    await waitForSnapshot(app, a);
    const b = (await createSnapshot(app, headers)).json().id;
    await waitForSnapshot(app, b);
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/snapshots",
      headers: { host: TEST_HOST },
    });
    expect(list.json().items.map((s: { id: string }) => s.id)).toEqual([b, a]);
    expect(list.json().nextCursor).toBeNull();

    const del = await app.inject({ method: "DELETE", url: `/api/v1/snapshots/${a}`, headers });
    expect(del.statusCode).toBe(204);
    const missing = await app.inject({
      method: "GET",
      url: `/api/v1/snapshots/${a}`,
      headers: { host: TEST_HOST },
    });
    expect(missing.statusCode).toBe(404);
  });

  it("keeps only the newest 10 completed backups", async () => {
    const { app, headers } = await setup({ providers: { acc_1: 1 }, accounts: 1 });
    for (let i = 0; i < 12; i += 1)
      await waitForSnapshot(app, (await createSnapshot(app, headers)).json().id);
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/snapshots",
      headers: { host: TEST_HOST },
    });
    expect(list.json().items).toHaveLength(10);
  });
});

describe("export", () => {
  it("downloads a vCard and a CSV of a completed backup", async () => {
    const { app, headers } = await setup({ providers: { acc_1: 2 }, accounts: 1 });
    const id = (await createSnapshot(app, headers)).json().id;
    await waitForSnapshot(app, id);

    const vcf = await app.inject({
      method: "GET",
      url: `/api/v1/snapshots/${id}/export?format=vcf`,
      headers: { host: TEST_HOST },
    });
    expect(vcf.statusCode).toBe(200);
    expect(vcf.headers["content-type"]).toBe("text/vcard; charset=utf-8");
    expect(vcf.headers["content-disposition"]).toBe(
      'attachment; filename="contact-fuse-backup-2026-01-01.vcf"',
    );
    expect(vcf.body.match(/BEGIN:VCARD/g)).toHaveLength(2);
    expect(vcf.body).toContain("NOTE:a\\;b\\,c\r\n");

    const csv = await app.inject({
      method: "GET",
      url: `/api/v1/snapshots/${id}/export?format=csv`,
      headers: { host: TEST_HOST },
    });
    expect(csv.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect(csv.body.split("\r\n").filter(Boolean)).toHaveLength(3);
    expect(csv.body).toContain(`"'+1 555-0100 (mobile)"`);
  });

  it("refuses to export a backup that did not complete", async () => {
    const { app, headers } = await setup({
      providers: { acc_1: new ProviderError("PROVIDER_UNAVAILABLE", "down") },
      accounts: 1,
    });
    const id = (await createSnapshot(app, headers)).json().id;
    await waitForSnapshot(app, id);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/snapshots/${id}/export?format=vcf`,
      headers: { host: TEST_HOST },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("SNAPSHOT_INCOMPLETE");
  });

  it("rejects unknown formats", async () => {
    const { app } = await setup({ providers: {}, accounts: 0 });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/snapshots/x/export?format=pdf",
      headers: { host: TEST_HOST },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("delete all local data", () => {
  it("requires typing DELETE", async () => {
    const { app, headers } = await setup({ providers: {}, accounts: 1 });
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/local-data/delete",
      headers,
      payload: { confirm: "yes" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("removes tokens, secrets, backups, accounts, settings and side files", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "contact-fuse-data-"));
    tempDirs.push(dataDir);
    writeFileSync(join(dataDir, "contact-fuse.sqlite.bak-2025-01-01"), "old");
    mkdirSync(join(dataDir, "logs"));
    writeFileSync(join(dataDir, "logs", "contact-fuse.log"), "log");

    const { app, headers, secrets } = await setup({ providers: { acc_1: 2, acc_2: 1 }, dataDir });
    await waitForSnapshot(app, (await createSnapshot(app, headers)).json().id);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/local-data/delete",
      headers,
      payload: { confirm: "DELETE" },
    });
    expect(res.statusCode).toBe(204);
    expect(secrets.keys()).toEqual([]);
    const get = (url: string) =>
      app.inject({ method: "GET", url, headers: { host: TEST_HOST } }).then((r) => r.json());
    expect((await get("/api/v1/accounts")).items).toEqual([]);
    expect((await get("/api/v1/snapshots")).items).toEqual([]);
    expect(await get("/api/v1/settings/google-client")).toEqual({ configured: false });
    expect(readdirSync(dataDir)).toEqual([]);
  });
});
