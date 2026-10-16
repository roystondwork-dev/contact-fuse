# Provider interface

A **provider** connects contact-fuse to one contact source. v1 ships `google`; `carddav` (iCloud,
Fastmail, Nextcloud) and `microsoft` (Graph) are planned. The interface is designed so the
[matching](matching-engine.md) and [merge](merge-engine.md) engines never know which provider they use
([ADR 0007](../adr/0007-provider-abstraction-and-canonical-model.md)).

## Responsibilities

| Provider does                                                     | Provider does not                   |
| ----------------------------------------------------------------- | ----------------------------------- |
| Authenticate requests with credentials given by the server        | Store tokens (server/keychain does) |
| Map native records ⇄ canonical `Contact`, keeping the raw payload | Decide what to merge                |
| Page through contacts, support incremental sync                   | Persist anything                    |
| Batch, rate-limit and retry writes; surface conflicts             | Swallow errors silently             |
| Declare its capabilities and limits                               | Log PII                             |

## Interface sketch

```ts
// packages/core/src/model/provider.ts — types only, no I/O
export interface ProviderCapabilities {
  incrementalSync: boolean; // supports sync tokens
  labels: boolean; // supports groups/labels
  versionedWrites: boolean; // supports etag / If-Match conflict detection
  otherContacts: boolean; // Google "Other contacts" (auto-saved) source
  maxBatchCreate: number; // Google: 200
  maxBatchUpdate: number; // Google: 200
  maxBatchDelete: number; // Google: 500
}

export interface ListContactsOptions {
  syncToken?: string; // omit for a full listing
  includeOtherContacts?: boolean;
  signal?: AbortSignal;
  onProgress?: (fetched: number) => void;
}

export interface ListContactsResult {
  contacts: ProviderContact[]; // canonical + raw + source ("contacts" | "other-contacts")
  deletedResourceIds: string[]; // only for incremental sync
  nextSyncToken?: string;
  /** True when the sync token expired and a full listing was returned instead. */
  fullResync: boolean;
}

export interface ProviderContact {
  contact: Contact;
  raw: unknown; // native payload, stored for exact restore
}

export type WriteOutcome =
  | { status: "succeeded"; ref: ContactRef; raw: unknown }
  | { status: "conflict"; ref: ContactRef } // etag mismatch — caller decides
  | { status: "not-found"; ref: ContactRef }
  | { status: "failed"; ref?: ContactRef; error: ProviderError };

export interface ContactProvider {
  readonly id: string; // "google"
  readonly capabilities: ProviderCapabilities;

  getAccountInfo(): Promise<{ providerAccountId: string; email: string; displayName?: string }>;

  listContacts(options?: ListContactsOptions): Promise<ListContactsResult>;
  listLabels(): Promise<{ id: string; name: string }[]>;

  createContacts(contacts: Contact[]): Promise<WriteOutcome[]>;
  /** `fields` limits which fields are written; everything else on the record is preserved. */
  updateContacts(
    updates: { ref: ContactRef; contact: Contact; fields: ContactField[] }[],
  ): Promise<WriteOutcome[]>;
  deleteContacts(refs: ContactRef[]): Promise<WriteOutcome[]>;

  ensureLabel(name: string): Promise<{ id: string; name: string }>;
  addToLabel(labelId: string, refs: ContactRef[]): Promise<WriteOutcome[]>;
}

export type ProviderFactory = (credentials: ProviderCredentials) => ContactProvider;
```

Arrays passed to write methods may exceed provider batch limits; the provider chunks them itself.
Outcomes are returned **in input order**, one per input item.

## Error model

Providers throw `ProviderError` (or `AuthError` for expired tokens), both extending `ContactFuseError` (see
[error handling](../standards/error-handling-and-logging.md)) with codes:

| Code                          | Meaning                                                     | Server reaction                                               |
| ----------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| `TOKEN_EXPIRED` (`AuthError`) | Refresh token revoked/expired (Google testing mode: 7 days) | Mark account `needs-reauth`, pause run                        |
| `PROVIDER_RATE_LIMITED`       | 429 / quota                                                 | Provider already retried with backoff; pause and resume later |
| `PROVIDER_SYNC_TOKEN_EXPIRED` | Sync token too old                                          | Handled inside provider → `fullResync: true`                  |
| `PROVIDER_UNAVAILABLE`        | 5xx / network                                               | Retry with backoff, then fail the operation                   |
| `PROVIDER_INVALID_REQUEST`    | 400 — our bug                                               | Fail operation, report                                        |
| `PROVIDER_PERMISSION_DENIED`  | Scope missing                                               | Ask user to reconnect with required scope                     |

## Google implementation notes

- API: People API v1 via the official per-API client `@googleapis/people` (not the full `googleapis`
  bundle). The server passes an already-authorised `OAuth2Client` (`google-auth-library`) to
  `createGoogleProvider({ auth, accountId })`; the provider never runs the OAuth flow or stores tokens.
- Every response is validated with Zod at the boundary (`schemas.ts`); a mismatch is
  `PROVIDER_RESPONSE_INVALID`. Unknown fields are kept so the raw `Person` survives for restore.
- Reads are retried by `withRetry` (`retry.ts`) per the
  [retry policy](../standards/error-handling-and-logging.md#4-handling-rules); gaxios's own retry is
  turned off so the policy is applied once. A `Retry-After` longer than 60 s is not waited out.
- Error mapping (`google-errors.ts`): 401 or `invalid_grant` → `TOKEN_EXPIRED`; 403/429 with a
  per-day quota → `PROVIDER_QUOTA_EXCEEDED`; other 429 → `PROVIDER_RATE_LIMITED`; other 403 →
  `PROVIDER_PERMISSION_DENIED`; 410 or `EXPIRED_SYNC_TOKEN` → `PROVIDER_SYNC_TOKEN_EXPIRED`;
  408/5xx/network → `PROVIDER_UNAVAILABLE`; other 4xx → `PROVIDER_INVALID_REQUEST`.
- Listing: `people.connections.list` (`resourceName=people/me`, `pageSize=1000`, `personFields`
  covering names, emailAddresses, phoneNumbers, organizations, birthdays, biographies, memberships,
  metadata), `requestSyncToken=true`. Incremental listings report `metadata.deleted` people as
  `deletedResourceIds`; an expired sync token restarts as a full listing with `fullResync: true`.
  Optional `otherContacts.list` (`readMask=names,emailAddresses,phoneNumbers`, read-only scope) is
  always listed in full.
- Labels: `contactGroups.list` is read once per listing. Only `USER_CONTACT_GROUP` groups become
  `Contact.groups` and `listLabels()` entries; system groups (`myContacts`, `starred`, …) are left
  out because they are Google-internal, but stay in the raw payload.
- M1 is read-only: write methods throw `PROVIDER_INVALID_REQUEST` until M3.
- Writes: `people.batchCreateContacts` (≤ 200), `people.batchUpdateContacts` (≤ 200, with etag and
  `updateMask`), `people.batchDeleteContacts` (≤ 500), `contactGroups.members.modify` for labels.
- Google recommends **sequential** mutate requests per user; the provider never parallelises writes.
- Writes are followed by propagation delay; reads right after writes may be stale — the server re-lists
  only when needed.
- Mapping lives in `mapping.ts`; Google `metadata.sources[].updateTime` → `Contact.updatedAt`.
- OAuth is owned by the server (`apps/server/src/auth/`); the provider receives an authorised client.
  See [security and privacy](security-and-privacy.md#oauth).

## Adding a provider

Follow the `add-provider` skill (`.claude/skills/add-provider/SKILL.md`): create
`packages/provider-<name>`, implement `ContactProvider`, add mapping round-trip tests with synthetic
fixtures, register it in `apps/server/src/providers.ts`, and write an ADR if it needs new capabilities.
