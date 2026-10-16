import { OAuth2Client } from "google-auth-library";
import { HttpResponse, http } from "msw/http";
import { setupServer } from "msw/node";
import type { SetupServer } from "msw/node";

import { TEST_ACCOUNT_ID } from "@contact-fuse/core/testing";
import type { ContactProvider } from "@contact-fuse/core";

import { PROFILE_PERSON } from "../fixtures/people.fixtures.ts";
import { createGoogleProvider } from "../google-provider.ts";

/** MSW handlers for the People API endpoints the provider reads. Tests override per case. */
export const PEOPLE_API = "https://people.googleapis.com/v1";
export const CONNECTIONS_URL = `${PEOPLE_API}/people/me/connections`;
export const PROFILE_URL = `${PEOPLE_API}/people/me`;
export const OTHER_CONTACTS_URL = `${PEOPLE_API}/otherContacts`;
export const CONTACT_GROUPS_URL = `${PEOPLE_API}/contactGroups`;

export const defaultHandlers = [
  http.get(PROFILE_URL, () => HttpResponse.json(PROFILE_PERSON)),
  http.get(CONNECTIONS_URL, () =>
    HttpResponse.json({ connections: [], nextSyncToken: "sync-default", totalItems: 0 }),
  ),
  http.get(OTHER_CONTACTS_URL, () => HttpResponse.json({ otherContacts: [] })),
  http.get(CONTACT_GROUPS_URL, () => HttpResponse.json({ contactGroups: [] })),
];

export function createMockServer(): SetupServer {
  return setupServer(...defaultHandlers);
}

export interface TestProvider {
  provider: ContactProvider;
  /** Every delay passed to the injected sleep, in order. */
  sleeps: number[];
}

/** A provider with a synthetic, never-expiring token and an instant, recording sleep. */
export function createTestProvider(random: () => number = () => 0.5): TestProvider {
  const auth = new OAuth2Client();
  // 2100-01-01: far enough in the future that the client never tries to refresh.
  auth.setCredentials({ access_token: "synthetic-access-token", expiry_date: 4_102_444_800_000 });
  const sleeps: number[] = [];
  const provider = createGoogleProvider({
    auth,
    accountId: TEST_ACCOUNT_ID,
    random,
    sleep: (ms, signal) => {
      sleeps.push(ms);
      signal?.throwIfAborted();
      return Promise.resolve();
    },
  });
  return { provider, sleeps };
}
