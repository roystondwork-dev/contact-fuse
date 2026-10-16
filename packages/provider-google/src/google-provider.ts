import { people } from "@googleapis/people";
import type { OAuth2Client } from "google-auth-library";
import type { z } from "zod";

import { ProviderError, isContactFuseError } from "@contact-fuse/core";
import type {
  AccountId,
  ContactProvider,
  ListContactsOptions,
  ListContactsResult,
  ProviderAccountInfo,
  ProviderCapabilities,
  ProviderContact,
  ProviderLabel,
} from "@contact-fuse/core";

import { toContactFuseError } from "./google-errors.ts";
import { personToContact } from "./mapping.ts";
import { defaultSleep, withRetry } from "./retry.ts";
import type { Sleep } from "./retry.ts";
import {
  ListConnectionsResponseSchema,
  ListContactGroupsResponseSchema,
  ListOtherContactsResponseSchema,
  PersonSchema,
} from "./schemas.ts";
import type { GoogleContactGroup, GooglePerson } from "./schemas.ts";

export const PROVIDER_ID = "google" as const;

/** Limits from the People API documentation. */
export const GOOGLE_CAPABILITIES: Readonly<ProviderCapabilities> = Object.freeze({
  incrementalSync: true,
  labels: true,
  versionedWrites: true,
  otherContacts: true,
  maxBatchCreate: 200,
  maxBatchUpdate: 200,
  maxBatchDelete: 500,
});

const PAGE_SIZE = 1000;
const PERSON_FIELDS =
  "names,emailAddresses,phoneNumbers,organizations,birthdays,biographies,memberships,metadata";
const OTHER_CONTACTS_READ_MASK = "names,emailAddresses,phoneNumbers";
const USER_CONTACT_GROUP = "USER_CONTACT_GROUP";

export interface GoogleProviderOptions {
  /** An already-authorised client. The server owns the OAuth flow and token storage. */
  auth: OAuth2Client;
  accountId: AccountId;
  /** Injected for deterministic retry tests. */
  sleep?: Sleep;
  /** Injected for deterministic retry jitter. Defaults to `Math.random`. */
  random?: () => number;
}

/** Creates a read-only (M1) Google People API provider. Writes arrive in M3. */
export function createGoogleProvider(options: GoogleProviderOptions): ContactProvider {
  const client = people({ version: "v1", auth: options.auth, retry: false });
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;

  /** Sends one idempotent read, retries per policy, maps errors and validates the response. */
  async function read<T>(
    operation: string,
    schema: z.ZodType<T>,
    send: (signal: AbortSignal | undefined) => Promise<{ data: unknown }>,
    signal?: AbortSignal,
  ): Promise<T> {
    const data = await withRetry(
      async () => {
        try {
          return (await send(signal)).data;
        } catch (error) {
          signal?.throwIfAborted();
          throw toContactFuseError(error, operation) ?? error;
        }
      },
      { sleep, random, ...(signal === undefined ? {} : { signal }) },
    );
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new ProviderError(
        "PROVIDER_RESPONSE_INVALID",
        `Google ${operation} response is invalid`,
        {
          details: {
            operation,
            issueCount: parsed.error.issues.length,
            firstIssuePath: parsed.error.issues[0]?.path.join(".") ?? "",
          },
        },
      );
    }
    return parsed.data;
  }

  /** Signal as gaxios method options, omitted when absent (exactOptionalPropertyTypes). */
  function withSignal(signal: AbortSignal | undefined): { signal?: AbortSignal } {
    return signal === undefined ? {} : { signal };
  }

  async function listContactGroups(signal?: AbortSignal): Promise<GoogleContactGroup[]> {
    const groups: GoogleContactGroup[] = [];
    let pageToken: string | undefined;
    do {
      signal?.throwIfAborted();
      const token = pageToken;
      const page = await read(
        "contactGroups.list",
        ListContactGroupsResponseSchema,
        (s) =>
          client.contactGroups.list(
            {
              pageSize: PAGE_SIZE,
              groupFields: "name,groupType",
              ...(token ? { pageToken: token } : {}),
            },
            withSignal(s),
          ),
        signal,
      );
      groups.push(...(page.contactGroups ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return groups;
  }

  async function listConnections(
    syncToken: string | undefined,
    context: ListingContext,
  ): Promise<{
    contacts: ProviderContact[];
    deletedResourceIds: string[];
    nextSyncToken?: string;
  }> {
    const contacts: ProviderContact[] = [];
    const deletedResourceIds: string[] = [];
    let nextSyncToken: string | undefined;
    let pageToken: string | undefined;
    do {
      context.signal?.throwIfAborted();
      const token = pageToken;
      const page = await read(
        "people.connections.list",
        ListConnectionsResponseSchema,
        (s) =>
          client.people.connections.list(
            {
              resourceName: "people/me",
              pageSize: PAGE_SIZE,
              personFields: PERSON_FIELDS,
              requestSyncToken: true,
              ...(syncToken ? { syncToken } : {}),
              ...(token ? { pageToken: token } : {}),
            },
            withSignal(s),
          ),
        context.signal,
      );
      for (const person of page.connections ?? []) {
        if (person.metadata?.deleted === true) {
          deletedResourceIds.push(person.resourceName);
          continue;
        }
        contacts.push(context.toProviderContact(person, "contacts"));
      }
      context.reportProgress(page.connections?.length ?? 0);
      pageToken = page.nextPageToken;
      nextSyncToken = page.nextSyncToken ?? nextSyncToken;
    } while (pageToken);
    return { contacts, deletedResourceIds, ...(nextSyncToken ? { nextSyncToken } : {}) };
  }

  async function listOtherContacts(context: ListingContext): Promise<ProviderContact[]> {
    const contacts: ProviderContact[] = [];
    let pageToken: string | undefined;
    do {
      context.signal?.throwIfAborted();
      const token = pageToken;
      const page = await read(
        "otherContacts.list",
        ListOtherContactsResponseSchema,
        (s) =>
          client.otherContacts.list(
            {
              pageSize: PAGE_SIZE,
              readMask: OTHER_CONTACTS_READ_MASK,
              ...(token ? { pageToken: token } : {}),
            },
            withSignal(s),
          ),
        context.signal,
      );
      for (const person of page.otherContacts ?? []) {
        contacts.push(context.toProviderContact(person, "other-contacts"));
      }
      context.reportProgress(page.otherContacts?.length ?? 0);
      pageToken = page.nextPageToken;
    } while (pageToken);
    return contacts;
  }

  async function listContacts(listOptions: ListContactsOptions = {}): Promise<ListContactsResult> {
    const { signal, onProgress } = listOptions;
    // Labels are fetched once per listing, then used to resolve every membership.
    const groupNamesByResource = toLabelMap(await listContactGroups(signal));

    let fetchedCount = 0;
    const context: ListingContext = {
      ...(signal === undefined ? {} : { signal }),
      reportProgress: (count) => {
        fetchedCount += count;
        onProgress?.(fetchedCount);
      },
      toProviderContact: (person, source) => ({
        contact: personToContact(person, { accountId: options.accountId, groupNamesByResource }),
        raw: person,
        source,
      }),
    };

    let fullResync = false;
    let connections: Awaited<ReturnType<typeof listConnections>>;
    try {
      connections = await listConnections(listOptions.syncToken, context);
    } catch (error) {
      const isExpiredToken =
        listOptions.syncToken !== undefined &&
        isContactFuseError(error) &&
        error.code === "PROVIDER_SYNC_TOKEN_EXPIRED";
      if (!isExpiredToken) throw error;
      // Sync tokens live about 7 days. Restart with a full listing; the caller sees fullResync.
      fullResync = true;
      fetchedCount = 0;
      connections = await listConnections(undefined, context);
    }

    // Other contacts are always listed in full: the result carries one sync token, which belongs
    // to the main connections listing.
    const otherContacts = listOptions.includeOtherContacts ? await listOtherContacts(context) : [];

    return {
      contacts: [...connections.contacts, ...otherContacts],
      deletedResourceIds: connections.deletedResourceIds,
      ...(connections.nextSyncToken ? { nextSyncToken: connections.nextSyncToken } : {}),
      fullResync,
    };
  }

  async function getAccountInfo(): Promise<ProviderAccountInfo> {
    const person = await read("people.get", PersonSchema, (s) =>
      client.people.get(
        { resourceName: "people/me", personFields: "names,emailAddresses,metadata" },
        withSignal(s),
      ),
    );
    const profileId = person.metadata?.sources?.find((source) => source.type === "PROFILE")?.id;
    const emails = person.emailAddresses ?? [];
    const email = (emails.find((entry) => entry.metadata?.primary === true) ?? emails[0])?.value;
    if (!profileId || !email) {
      throw new ProviderError(
        "PROVIDER_RESPONSE_INVALID",
        "Google profile is missing its ID or email",
        {
          details: {
            operation: "people.get",
            hasProfileId: Boolean(profileId),
            hasEmail: Boolean(email),
          },
        },
      );
    }
    const names = person.names ?? [];
    const displayName = (names.find((name) => name.metadata?.primary === true) ?? names[0])
      ?.displayName;
    return { providerAccountId: profileId, email, ...(displayName ? { displayName } : {}) };
  }

  async function listLabels(): Promise<ProviderLabel[]> {
    return [...toLabelMap(await listContactGroups())].map(([id, name]) => ({ id, name }));
  }

  return {
    id: PROVIDER_ID,
    capabilities: GOOGLE_CAPABILITIES,
    getAccountInfo,
    listContacts,
    listLabels,
    createContacts: rejectWrite,
    updateContacts: rejectWrite,
    deleteContacts: rejectWrite,
    ensureLabel: rejectWrite,
    addToLabel: rejectWrite,
  };
}

interface ListingContext {
  signal?: AbortSignal;
  reportProgress: (count: number) => void;
  toProviderContact: (person: GooglePerson, source: ProviderContact["source"]) => ProviderContact;
}

/**
 * Resource name → label name for **user-created** groups only. System groups (`myContacts`,
 * `starred`, `friends`, `family`, `coworkers`, `chatBuddies`, `all`, `blocked`) are Google-internal:
 * every saved contact is in `myContacts`, so carrying them into `Contact.groups` would add noise to
 * matching and make merges create labels that other providers do not have. They are left out of
 * both `Contact.groups` and `listLabels()`; the raw payload still keeps every membership.
 */
function toLabelMap(groups: readonly GoogleContactGroup[]): Map<string, string> {
  const labels = new Map<string, string>();
  for (const group of groups) {
    if (group.groupType !== USER_CONTACT_GROUP) continue;
    const name = group.name ?? group.formattedName;
    if (name) labels.set(group.resourceName, name);
  }
  return labels;
}

function rejectWrite(): Promise<never> {
  return Promise.reject(
    new ProviderError("PROVIDER_INVALID_REQUEST", "Writes are not implemented until M3"),
  );
}
