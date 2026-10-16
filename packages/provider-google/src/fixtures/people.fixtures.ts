import type { GoogleContactGroup, GooglePerson } from "../schemas.ts";

/**
 * Synthetic People API payloads. Never put real names, emails or numbers here
 * (docs/standards/testing.md#5-test-data-synthetic-only).
 */
export const PROFILE_ID = "100000000000000000001";

export function buildPerson(n: number, overrides: Partial<GooglePerson> = {}): GooglePerson {
  return {
    resourceName: `people/c${n}`,
    etag: `%EgUBAgMuNz0aBAECBQc=${n}`,
    metadata: {
      sources: [
        { type: "CONTACT", id: `c${n}`, etag: `#${n}`, updateTime: "2026-01-01T00:00:00Z" },
      ],
      objectType: "PERSON",
    },
    names: [
      {
        metadata: { primary: true, source: { type: "CONTACT", id: `c${n}` } },
        displayName: `Test Person ${n}`,
        givenName: "Test",
        familyName: `Person ${n}`,
        displayNameLastFirst: `Person ${n}, Test`,
      },
    ],
    emailAddresses: [
      {
        metadata: { primary: true },
        value: `test.person${n}@example.com`,
        type: "home",
        formattedType: "Home",
      },
    ],
    phoneNumbers: [
      {
        value: `+1 555-01${String(n % 100).padStart(2, "0")}`,
        canonicalForm: `+1555501${String(n % 100).padStart(2, "0")}`,
        type: "mobile",
      },
    ],
    ...overrides,
  };
}

export function buildDeletedPerson(n: number): GooglePerson {
  return {
    resourceName: `people/c${n}`,
    etag: `%deleted${n}`,
    metadata: { deleted: true, sources: [{ type: "CONTACT", id: `c${n}` }] },
  };
}

export function buildUserGroup(id: string, name: string): GoogleContactGroup {
  return {
    resourceName: `contactGroups/${id}`,
    etag: `group-etag-${id}`,
    name,
    formattedName: name,
    groupType: "USER_CONTACT_GROUP",
  };
}

export function buildSystemGroup(id: string): GoogleContactGroup {
  return {
    resourceName: `contactGroups/${id}`,
    name: id,
    formattedName: id,
    groupType: "SYSTEM_CONTACT_GROUP",
  };
}

export const PROFILE_PERSON = {
  resourceName: `people/${PROFILE_ID}`,
  etag: "%profile",
  metadata: {
    sources: [
      { type: "PROFILE", id: PROFILE_ID, etag: "#profile" },
      { type: "DOMAIN_PROFILE", id: "200000000000000000002" },
    ],
    objectType: "PERSON",
  },
  names: [{ metadata: { primary: true }, displayName: "Account Owner Example" }],
  emailAddresses: [
    { metadata: { primary: false }, value: "secondary.owner@example.org" },
    { metadata: { primary: true }, value: "account.owner@example.com" },
  ],
} as const satisfies GooglePerson;

/** A Google error body (AIP-193) with optional ErrorInfo reason and metadata. */
export function buildGoogleError(
  code: number,
  status: string,
  reason?: string,
  metadata?: Record<string, string>,
): { error: Record<string, unknown> } {
  return {
    error: {
      code,
      status,
      message: `Synthetic ${status} error`,
      ...(reason === undefined
        ? {}
        : {
            details: [
              {
                "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                reason,
                domain: "googleapis.com",
                ...(metadata === undefined ? {} : { metadata }),
              },
            ],
          }),
    },
  };
}
