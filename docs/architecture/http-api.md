# HTTP API reference

The contract between `apps/web` and `apps/server`. The UI is built against this document, and the
server's route tests check it. Conventions (errors, pagination, jobs, naming) are in
[API design](../standards/api-design.md).

**Change this document in the same PR as the route.** Endpoints are added per milestone; this page
lists what exists or is being built now (M1).

## Basics

- Base path `/api/v1`, JSON in and out, camelCase fields, ISO-8601 UTC timestamps.
- Every request must use host `127.0.0.1:<port>` or `localhost:<port>`.
- Every **write** (`POST`, `PUT`, `PATCH`, `DELETE`) needs an `Origin` header from the app and the
  `x-csrf-token` header (see [Session](#session)). Otherwise: `403 FORBIDDEN_REQUEST`.
- Errors: `{ "error": { "code": "UPPER_SNAKE", "message": "…", "details": { … } } }`. The UI shows its
  own copy per `code` ([content style guide](../design/content-style-guide.md)), never `message`.
- Lists: `{ "items": [...], "nextCursor": string | null }`. M1 lists are small and always return
  `nextCursor: null`.

## Session

| Method | Path              | Response                    | Notes                                                                                                                            |
| ------ | ----------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/session` | `200 { csrfToken: string }` | Sets an HttpOnly `cf_csrf` cookie. Call once at startup; send `csrfToken` as `x-csrf-token` on every write. Re-call after a 403. |
| GET    | `/api/health`     | `200 { status: "ok" }`      | Unversioned liveness check.                                                                                                      |

## Google OAuth client settings

The user's own OAuth client ([Google Cloud setup](../guides/google-cloud-setup.md)). The secret is
write-only: the API never returns it.

| Method | Path                             | Body                                         | Response                                         |
| ------ | -------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| GET    | `/api/v1/settings/google-client` | —                                            | `200 { configured: boolean, clientId?: string }` |
| PUT    | `/api/v1/settings/google-client` | `{ clientId: string, clientSecret: string }` | `200 { configured: true, clientId: string }`     |
| DELETE | `/api/v1/settings/google-client` | —                                            | `204`                                            |

`clientId` must end with `.apps.googleusercontent.com` (else `400 VALIDATION_FAILED`,
`details.fields = "clientId"`).

## Accounts

```ts
interface Account {
  id: string;
  provider: "google";
  email: string; // the user's own account; shown in the UI, never logged
  displayName?: string;
  isMain: boolean;
  status: "connected" | "needs-reauth" | "disconnected";
  includesOtherContacts: boolean; // granted contacts.other.readonly
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string; // changes on every connect, reconnect, status change and backup
}
```

| Method | Path                       | Body                                                     | Response                                                                                                                                    |
| ------ | -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/accounts`         | —                                                        | `200 { items: Account[], nextCursor: null }`, oldest first. Disconnected accounts are included (their backups still exist).                 |
| POST   | `/api/v1/accounts/connect` | `{ provider: "google", includeOtherContacts?: boolean }` | `200 { authorizationUrl: string }`. `412 OAUTH_CLIENT_MISSING` if the client is not configured.                                             |
| DELETE | `/api/v1/accounts/:id`     | —                                                        | `204`. Revokes the token at Google, deletes it from the keychain, sets `status: "disconnected"`. Backups are kept. `404 ACCOUNT_NOT_FOUND`. |

**Connect flow:** the UI opens `authorizationUrl` in a new browser tab. Google redirects that tab to
`GET /oauth/callback` on the local server, which stores the token, creates or reconnects the account,
and shows a "Connected, you can close this tab" page. The UI refetches `GET /api/v1/accounts` when its
window regains focus (and every 3 s while a connect is pending) to show the new account. Reconnecting
an existing Google account updates that row instead of adding a duplicate.

`GET /oauth/callback` is a browser page, not a JSON API. Failures (denied consent, expired or reused
`state`) render an error page that tells the user to try again from the app.

## Snapshots (backups)

```ts
interface Snapshot {
  id: string;
  status: "running" | "completed" | "failed";
  contactCount: number;
  accountCount: number;
  errorCode?: string;
  createdAt: string;
  completedAt?: string;
  accounts: { accountId: string; email: string; contactCount: number }[];
  progress?: { fetched: number }; // only while running
}
```

| Method | Path                           | Body               | Response                                                                                                                                                                                                                                                                         |
| ------ | ------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/snapshots`            | `{}`               | `202 Snapshot` (`status: "running"`) + `Location`. `409 RUN_IN_PROGRESS` if one is already running. `401 AUTH_REQUIRED` if no account is connected.                                                                                                                              |
| GET    | `/api/v1/snapshots`            | —                  | `200 { items: Snapshot[], nextCursor: null }`, newest first.                                                                                                                                                                                                                     |
| GET    | `/api/v1/snapshots/:id`        | —                  | `200 Snapshot`. The UI polls every 1 s while `status` is `running`. `404 NOT_FOUND`.                                                                                                                                                                                             |
| GET    | `/api/v1/snapshots/:id/export` | `?format=vcf\|csv` | `200` file download (`Content-Disposition: attachment; filename="contact-fuse-backup-<date>.<ext>"`). Only for `completed` snapshots, else `409 SNAPSHOT_INCOMPLETE`. CSV cells starting with `=`, `+`, `-` or `@` get a leading `'` so spreadsheets never run them as formulas. |
| DELETE | `/api/v1/snapshots/:id`        | —                  | `204`.                                                                                                                                                                                                                                                                           |

The newest **10 completed** snapshots are kept; older ones are pruned after each successful backup. A snapshot left `running` by a crash is marked `failed` (`INTERNAL_ERROR`) at the next start.

A snapshot covers every **connected** account. If an account's token has expired, the snapshot fails
with `errorCode: "TOKEN_EXPIRED"` and the account becomes `needs-reauth`. Progress uses polling in M1;
Server-Sent Events arrive with long-running merge runs (M3).

## Local data

| Method | Path                        | Body                    | Response                                                                                                                                                                                      |
| ------ | --------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/local-data/delete` | `{ confirm: "DELETE" }` | `204`. `409 RUN_IN_PROGRESS` while a backup is running. Revokes and removes every token, deletes all snapshots, accounts, settings and logs. The server keeps running with an empty database. |
