import { HttpResponse, http } from "msw/http";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { AuthError, ProviderError } from "@contact-fuse/core";
import type { ContactFuseError } from "@contact-fuse/core";
import { buildContact } from "@contact-fuse/core/testing";

import {
  PROFILE_ID,
  PROFILE_PERSON,
  buildDeletedPerson,
  buildGoogleError,
  buildPerson,
  buildSystemGroup,
  buildUserGroup,
} from "./fixtures/people.fixtures.ts";
import { GOOGLE_CAPABILITIES, PROVIDER_ID } from "./google-provider.ts";
import {
  CONNECTIONS_URL,
  CONTACT_GROUPS_URL,
  OTHER_CONTACTS_URL,
  PROFILE_URL,
  createMockServer,
  createTestProvider,
} from "./testing/handlers.ts";

const server = createMockServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Records the query string of every request to a URL and answers with the next canned response. */
function respondInSequence(url: string, responses: (() => Response)[]): URLSearchParams[] {
  const seen: URLSearchParams[] = [];
  server.use(
    http.get(url, ({ request }) => {
      seen.push(new URL(request.url).searchParams);
      const respond = responses[Math.min(seen.length - 1, responses.length - 1)];
      if (!respond) throw new Error("no canned response");
      return respond();
    }),
  );
  return seen;
}

function json(body: unknown, init?: ResponseInit): () => Response {
  return () => HttpResponse.json(body as Record<string, unknown>, init);
}

async function captureError(promise: Promise<unknown>): Promise<ContactFuseError> {
  try {
    await promise;
  } catch (error) {
    return error as ContactFuseError;
  }
  throw new Error("expected the promise to reject");
}

describe("createGoogleProvider", () => {
  it("identifies itself and declares Google's capabilities", () => {
    const { provider } = createTestProvider();

    expect(provider.id).toBe(PROVIDER_ID);
    expect(provider.capabilities).toEqual(GOOGLE_CAPABILITIES);
  });

  it("rejects every write until M3", async () => {
    const { provider } = createTestProvider();
    const contact = buildContact();

    const results = await Promise.allSettled([
      provider.createContacts([contact]),
      provider.updateContacts([{ ref: contact.ref, contact, fields: ["names"] }]),
      provider.deleteContacts([contact.ref]),
      provider.ensureLabel("Test Label"),
      provider.addToLabel("contactGroups/abc", [contact.ref]),
    ]);

    for (const result of results) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") {
        expect(result.reason).toBeInstanceOf(ProviderError);
        expect(result.reason.code).toBe("PROVIDER_INVALID_REQUEST");
      }
    }
  });
});

describe("getAccountInfo", () => {
  it("returns the profile source ID, primary email and display name", async () => {
    const seen = respondInSequence(PROFILE_URL, [json(PROFILE_PERSON)]);
    const { provider } = createTestProvider();

    const info = await provider.getAccountInfo();

    expect(info).toEqual({
      providerAccountId: PROFILE_ID,
      email: "account.owner@example.com",
      displayName: "Account Owner Example",
    });
    expect(seen[0]?.get("personFields")).toBe("names,emailAddresses,metadata");
  });

  it("throws PROVIDER_RESPONSE_INVALID when the profile source is missing", async () => {
    respondInSequence(PROFILE_URL, [
      json({ ...PROFILE_PERSON, metadata: { sources: [{ type: "CONTACT", id: "c1" }] } }),
    ]);
    const { provider } = createTestProvider();

    const error = await captureError(provider.getAccountInfo());

    expect(error.code).toBe("PROVIDER_RESPONSE_INVALID");
    expect(error.message).not.toContain("example.com");
  });
});

describe("listContacts", () => {
  it("follows nextPageToken across three pages and reports running progress", async () => {
    const seen = respondInSequence(CONNECTIONS_URL, [
      json({ connections: [buildPerson(1), buildPerson(2)], nextPageToken: "page-2" }),
      json({ connections: [buildPerson(3), buildPerson(4)], nextPageToken: "page-3" }),
      json({ connections: [buildPerson(5)], nextSyncToken: "sync-1" }),
    ]);
    const { provider } = createTestProvider();
    const progress: number[] = [];

    const result = await provider.listContacts({ onProgress: (count) => progress.push(count) });

    expect(result.contacts.map((c) => c.contact.ref.resourceId)).toEqual([
      "people/c1",
      "people/c2",
      "people/c3",
      "people/c4",
      "people/c5",
    ]);
    expect(result.contacts.every((c) => c.source === "contacts")).toBe(true);
    expect(result.contacts[0]?.raw).toEqual(buildPerson(1));
    expect(result).toMatchObject({
      deletedResourceIds: [],
      nextSyncToken: "sync-1",
      fullResync: false,
    });
    expect(progress).toEqual([2, 4, 5]);
    expect(seen.map((params) => params.get("pageToken"))).toEqual([null, "page-2", "page-3"]);
    expect(seen[0]?.get("pageSize")).toBe("1000");
    expect(seen[0]?.get("requestSyncToken")).toBe("true");
    expect(seen[0]?.get("personFields")).toBe(
      "names,emailAddresses,phoneNumbers,organizations,birthdays,biographies,memberships,metadata",
    );
  });

  it("lists incrementally with a sync token and reports deletions", async () => {
    const seen = respondInSequence(CONNECTIONS_URL, [
      json({ connections: [buildPerson(7), buildDeletedPerson(8)], nextSyncToken: "sync-2" }),
    ]);
    const { provider } = createTestProvider();

    const result = await provider.listContacts({ syncToken: "sync-1" });

    expect(seen[0]?.get("syncToken")).toBe("sync-1");
    expect(result.contacts.map((c) => c.contact.ref.resourceId)).toEqual(["people/c7"]);
    expect(result.deletedResourceIds).toEqual(["people/c8"]);
    expect(result.nextSyncToken).toBe("sync-2");
    expect(result.fullResync).toBe(false);
  });

  it.each([
    ["HTTP 410", 410, buildGoogleError(410, "GONE")],
    [
      "HTTP 400 EXPIRED_SYNC_TOKEN",
      400,
      buildGoogleError(400, "FAILED_PRECONDITION", "EXPIRED_SYNC_TOKEN"),
    ],
  ])(
    "falls back to a full listing when the sync token expired (%s)",
    async (_name, status, body) => {
      const seen = respondInSequence(CONNECTIONS_URL, [
        json(body, { status }),
        json({ connections: [buildPerson(1)], nextSyncToken: "sync-fresh" }),
      ]);
      const { provider, sleeps } = createTestProvider();
      const progress: number[] = [];

      const result = await provider.listContacts({
        syncToken: "sync-old",
        onProgress: (count) => progress.push(count),
      });

      expect(result.fullResync).toBe(true);
      expect(result.nextSyncToken).toBe("sync-fresh");
      expect(result.contacts).toHaveLength(1);
      expect(seen.map((params) => params.get("syncToken"))).toEqual(["sync-old", null]);
      expect(sleeps).toEqual([]);
      expect(progress).toEqual([1]);
    },
  );

  it("throws PROVIDER_SYNC_TOKEN_EXPIRED when Google returns 410 without a sync token", async () => {
    respondInSequence(CONNECTIONS_URL, [json(buildGoogleError(410, "GONE"), { status: 410 })]);
    const { provider } = createTestProvider();

    const error = await captureError(provider.listContacts());

    expect(error.code).toBe("PROVIDER_SYNC_TOKEN_EXPIRED");
  });

  it("adds other contacts with their own source and read mask when asked", async () => {
    respondInSequence(CONNECTIONS_URL, [json({ connections: [buildPerson(1)] })]);
    const otherSeen = respondInSequence(OTHER_CONTACTS_URL, [
      json({
        otherContacts: [buildPerson(101, { resourceName: "otherContacts/c101" })],
        nextPageToken: "o2",
      }),
      json({ otherContacts: [buildPerson(102, { resourceName: "otherContacts/c102" })] }),
    ]);
    const { provider } = createTestProvider();
    const progress: number[] = [];

    const result = await provider.listContacts({
      includeOtherContacts: true,
      onProgress: (count) => progress.push(count),
    });

    expect(result.contacts.map((c) => [c.contact.ref.resourceId, c.source])).toEqual([
      ["people/c1", "contacts"],
      ["otherContacts/c101", "other-contacts"],
      ["otherContacts/c102", "other-contacts"],
    ]);
    expect(otherSeen[0]?.get("readMask")).toBe("names,emailAddresses,phoneNumbers");
    expect(otherSeen[1]?.get("pageToken")).toBe("o2");
    expect(progress).toEqual([1, 2, 3]);
  });

  it("does not call other contacts unless asked", async () => {
    server.use(http.get(OTHER_CONTACTS_URL, () => HttpResponse.error()));
    const { provider } = createTestProvider();

    const result = await provider.listContacts();

    expect(result.contacts).toEqual([]);
  });

  it("maps memberships of user groups to label names and leaves system groups out", async () => {
    respondInSequence(CONTACT_GROUPS_URL, [
      json({
        contactGroups: [buildSystemGroup("myContacts"), buildUserGroup("abc", "Test Label")],
        nextPageToken: "groups-2",
      }),
      json({ contactGroups: [buildSystemGroup("starred"), buildUserGroup("def", "Other Label")] }),
    ]);
    respondInSequence(CONNECTIONS_URL, [
      json({
        connections: [
          buildPerson(1, {
            memberships: [
              { contactGroupMembership: { contactGroupResourceName: "contactGroups/myContacts" } },
              { contactGroupMembership: { contactGroupResourceName: "contactGroups/starred" } },
              { contactGroupMembership: { contactGroupResourceName: "contactGroups/def" } },
            ],
          }),
        ],
      }),
    ]);
    const { provider } = createTestProvider();

    const result = await provider.listContacts();

    expect(result.contacts[0]?.contact.groups).toEqual(["Other Label"]);
  });

  it("stops paging and rejects when the signal is aborted", async () => {
    const seen = respondInSequence(CONNECTIONS_URL, [
      json({ connections: [buildPerson(1)], nextPageToken: "page-2" }),
      json({ connections: [buildPerson(2)] }),
    ]);
    const { provider } = createTestProvider();
    const controller = new AbortController();

    const error = await captureError(
      provider.listContacts({
        signal: controller.signal,
        onProgress: () => controller.abort(new Error("cancelled by test")),
      }),
    );

    expect((error as Error).message).toBe("cancelled by test");
    expect(seen).toHaveLength(1);
  });
});

describe("listLabels", () => {
  it("returns user-created groups from every page", async () => {
    respondInSequence(CONTACT_GROUPS_URL, [
      json({
        contactGroups: [buildUserGroup("abc", "Test Label"), buildSystemGroup("starred")],
        nextPageToken: "g2",
      }),
      json({ contactGroups: [buildUserGroup("def", "Other Label")] }),
    ]);
    const { provider } = createTestProvider();

    const labels = await provider.listLabels();

    expect(labels).toEqual([
      { id: "contactGroups/abc", name: "Test Label" },
      { id: "contactGroups/def", name: "Other Label" },
    ]);
  });
});

describe("error mapping", () => {
  it.each([
    ["401", 401, buildGoogleError(401, "UNAUTHENTICATED"), AuthError, "TOKEN_EXPIRED"],
    ["invalid_grant", 400, { error: "invalid_grant" }, AuthError, "TOKEN_EXPIRED"],
    [
      "403 insufficient scope",
      403,
      buildGoogleError(403, "PERMISSION_DENIED", "ACCESS_TOKEN_SCOPE_INSUFFICIENT"),
      ProviderError,
      "PROVIDER_PERMISSION_DENIED",
    ],
    [
      "429 daily quota",
      429,
      buildGoogleError(429, "RESOURCE_EXHAUSTED", "RATE_LIMIT_EXCEEDED", {
        quota_limit: "ReadRequestsPerDayPerProject",
      }),
      ProviderError,
      "PROVIDER_QUOTA_EXCEEDED",
    ],
    [
      "403 daily limit",
      403,
      { error: { code: 403, errors: [{ reason: "dailyLimitExceeded" }] } },
      ProviderError,
      "PROVIDER_QUOTA_EXCEEDED",
    ],
    [
      "400",
      400,
      buildGoogleError(400, "INVALID_ARGUMENT"),
      ProviderError,
      "PROVIDER_INVALID_REQUEST",
    ],
    ["404", 404, { error: { code: 404 } }, ProviderError, "PROVIDER_INVALID_REQUEST"],
  ])(
    "maps %s to its error code without retrying",
    async (_name, status, body, errorClass, code) => {
      const seen = respondInSequence(PROFILE_URL, [json(body, { status })]);
      const { provider, sleeps } = createTestProvider();

      const error = await captureError(provider.getAccountInfo());

      expect(error).toBeInstanceOf(errorClass);
      expect(error.code).toBe(code);
      expect(error.details).toMatchObject({ operation: "people.get", httpStatus: status });
      expect(error.message).not.toContain("Synthetic");
      expect(seen).toHaveLength(1);
      expect(sleeps).toEqual([]);
    },
  );

  it("retries 5xx with backoff and gives up with PROVIDER_UNAVAILABLE after five attempts", async () => {
    const seen = respondInSequence(PROFILE_URL, [
      json(buildGoogleError(503, "UNAVAILABLE"), { status: 503 }),
    ]);
    const { provider, sleeps } = createTestProvider(() => 0.5);

    const error = await captureError(provider.getAccountInfo());

    expect(error.code).toBe("PROVIDER_UNAVAILABLE");
    expect(error.isRetryable).toBe(true);
    expect(seen).toHaveLength(5);
    expect(sleeps).toEqual([250, 500, 1000, 2000]);
  });

  it("honours Retry-After on 429 and then succeeds", async () => {
    const seen = respondInSequence(PROFILE_URL, [
      json(buildGoogleError(429, "RESOURCE_EXHAUSTED", "RATE_LIMIT_EXCEEDED"), {
        status: 429,
        headers: { "Retry-After": "2" },
      }),
      json(buildGoogleError(429, "RESOURCE_EXHAUSTED"), { status: 429 }),
      json(PROFILE_PERSON),
    ]);
    const { provider, sleeps } = createTestProvider(() => 0.5);

    const info = await provider.getAccountInfo();

    expect(info.providerAccountId).toBe(PROFILE_ID);
    expect(seen).toHaveLength(3);
    expect(sleeps).toEqual([2000, 500]);
  });

  it("maps network failures to PROVIDER_UNAVAILABLE", async () => {
    server.use(http.get(PROFILE_URL, () => HttpResponse.error()));
    const { provider, sleeps } = createTestProvider();

    const error = await captureError(provider.getAccountInfo());

    expect(error.code).toBe("PROVIDER_UNAVAILABLE");
    expect(sleeps).toHaveLength(4);
  });

  it("rejects malformed responses with PROVIDER_RESPONSE_INVALID", async () => {
    respondInSequence(CONNECTIONS_URL, [json({ connections: [{ names: "not-an-array" }] })]);
    const { provider } = createTestProvider();

    const error = await captureError(provider.listContacts());

    expect(error.code).toBe("PROVIDER_RESPONSE_INVALID");
    expect(error.details).toMatchObject({ operation: "people.connections.list" });
  });
});
