# Error Handling and Logging

This document defines how contact-fuse represents, propagates, reports and logs errors. Two goals drive it: users must always know whether their contacts are safe after something fails, and logs must be useful for debugging **without ever containing personal data or secrets**.

Related: [coding-standards.md](coding-standards.md) · [api-design.md](api-design.md#7-errors) · [security-and-privacy.md](../architecture/security-and-privacy.md) · [merge-engine.md](../architecture/merge-engine.md) · [content-style-guide.md](../design/content-style-guide.md)

## Contents

1. [Principles](#1-principles)
2. [Error hierarchy](#2-error-hierarchy)
3. [Error code catalog](#3-error-code-catalog)
4. [Handling rules](#4-handling-rules)
5. [PII and secret redaction](#5-pii-and-secret-redaction)
6. [Logging](#6-logging)
7. [User-facing errors](#7-user-facing-errors)

---

## 1. Principles

1. **Never throw strings or plain objects.** Throw `ContactFuseError` subclasses (or let unknown errors bubble to be wrapped).
2. **Every error has a stable `code`.** Code is for machines (API clients, UI logic, tests); `message` is for developers; the UI renders its own copy from the code.
3. **Fail safe during writes.** If a write to a provider fails mid-run, stop, record what happened in the audit log, and leave the run in a resumable/undoable state. Never "continue and hope".
4. **Errors carry context, not data.** Include IDs and counts (`accountId`, `operationIndex`), never names, emails, phone numbers, or tokens.
5. **Handle or propagate — never swallow.** An empty `catch {}` is a bug.

## 2. Error hierarchy

Defined in `@contact-fuse/core` (`src/errors.ts`) so every package shares it. Each subclass constructor accepts only its own codes and sets the HTTP status and retryability from this catalog.

```ts
export class ContactFuseError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly isRetryable: boolean;
  readonly details?: Readonly<Record<string, string | number | boolean>>;

  constructor(code: ErrorCode, message: string, options: ContactFuseErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = options.httpStatus ?? 500;
    this.isRetryable = options.isRetryable ?? false;
    this.details = options.details;
  }
}
```

| Class              | Base               | Used for                                                                       |
| ------------------ | ------------------ | ------------------------------------------------------------------------------ |
| `ContactFuseError` | `Error`            | root; never thrown directly except via `INTERNAL_ERROR` wrapper                |
| `ValidationError`  | `ContactFuseError` | invalid input (HTTP body, config, settings) — 400/422                          |
| `NotFoundError`    | `ContactFuseError` | missing resource — 404                                                         |
| `ConflictError`    | `ContactFuseError` | state conflicts: etag mismatch, run already applied — 409                      |
| `AuthError`        | `ContactFuseError` | OAuth / token problems — 401                                                   |
| `ProviderError`    | `ContactFuseError` | upstream provider failures (rate limit, quota, 5xx) — 502/503                  |
| `SafetyError`      | `ContactFuseError` | a safety invariant would be violated (no snapshot, plan out of date) — 412/409 |
| `StorageError`     | `ContactFuseError` | DB, file system, keychain failures — 500                                       |

`details` values must be primitives and PII-free. `details` is typed to prevent passing whole objects.

## 3. Error code catalog

Codes are UPPER_SNAKE_CASE, never renamed once released (they are part of the public API). Add new codes here in the same PR that introduces them.

| Code                          | Class       | HTTP | Retryable | Meaning                                                                     |
| ----------------------------- | ----------- | ---- | --------- | --------------------------------------------------------------------------- |
| `VALIDATION_FAILED`           | Validation  | 400  | no        | Request/config failed schema validation; `details` lists field paths        |
| `INVALID_SETTINGS`            | Validation  | 422  | no        | Settings are syntactically valid but inconsistent (e.g. thresholds overlap) |
| `NOT_FOUND`                   | NotFound    | 404  | no        | Generic missing resource; `details.resource`                                |
| `ACCOUNT_NOT_FOUND`           | NotFound    | 404  | no        | Account ID unknown                                                          |
| `NO_MAIN_ACCOUNT`             | Safety      | 412  | no        | Action requires a main account and none is selected                         |
| `SNAPSHOT_REQUIRED`           | Safety      | 412  | no        | Write attempted without a completed snapshot                                |
| `PLAN_OUTDATED`               | Safety      | 409  | no        | Contacts changed since the plan was built; rebuild the plan                 |
| `RUN_ALREADY_APPLIED`         | Conflict    | 409  | no        | Run with this idempotency key already exists                                |
| `RUN_IN_PROGRESS`             | Conflict    | 409  | no        | Another run is active; only one at a time                                   |
| `UNDO_NOT_POSSIBLE`           | Conflict    | 409  | no        | Run cannot be undone (e.g. contacts changed after it)                       |
| `ETAG_MISMATCH`               | Conflict    | 409  | no        | Contact edited elsewhere since snapshot; operation skipped                  |
| `AUTH_REQUIRED`               | Auth        | 401  | no        | No token for account; user must connect                                     |
| `TOKEN_EXPIRED`               | Auth        | 401  | no        | Refresh token expired/revoked (e.g. 7-day testing-mode expiry); reconnect   |
| `OAUTH_CLIENT_MISSING`        | Auth        | 412  | no        | User has not configured a Google OAuth client                               |
| `OAUTH_FLOW_FAILED`           | Auth        | 400  | no        | Consent denied, state mismatch, or PKCE failure                             |
| `FORBIDDEN_REQUEST`           | Auth        | 403  | no        | Host, Origin or CSRF check failed on the local server                       |
| `PROVIDER_RATE_LIMITED`       | Provider    | 503  | yes       | 429 from provider                                                           |
| `PROVIDER_QUOTA_EXCEEDED`     | Provider    | 503  | no        | Daily quota exhausted                                                       |
| `PROVIDER_UNAVAILABLE`        | Provider    | 502  | yes       | Provider 5xx or network error                                               |
| `PROVIDER_RESPONSE_INVALID`   | Provider    | 502  | no        | Response failed Zod parsing                                                 |
| `PROVIDER_INVALID_REQUEST`    | Provider    | 502  | no        | Provider rejected our request (400): a bug in contact-fuse                  |
| `PROVIDER_PERMISSION_DENIED`  | Provider    | 403  | no        | A required scope was not granted; reconnect with it                         |
| `PROVIDER_SYNC_TOKEN_EXPIRED` | Provider    | 502  | no        | Sync token too old; handled inside the provider with a full re-list         |
| `STORAGE_FAILED`              | Storage     | 500  | no        | DB/file error                                                               |
| `KEYCHAIN_UNAVAILABLE`        | Storage     | 500  | no        | OS keychain inaccessible                                                    |
| `INTERNAL_ERROR`              | ContactFuse | 500  | no        | Anything unexpected; wraps the original as `cause`                          |

## 4. Handling rules

- **Convert at the boundary.** Provider packages catch HTTP/library errors and rethrow `ProviderError`/`AuthError` with `cause` set. Code above a provider never inspects Google client (gaxios) error shapes.
- **Wrap unknowns.** The Fastify error handler converts any non-`ContactFuseError` into `INTERNAL_ERROR`, logs the original (redacted) at `error`, and returns a generic message.
- **Retry policy.** Only `isRetryable` errors on idempotent operations; exponential backoff (base 500 ms, factor 2, max 5 attempts, full jitter); respect `Retry-After`. Non-idempotent writes (create) are retried only when guarded by a client-side dedup key.
- **Mid-run failure.** The executor stops at the first non-retryable error, marks the run `failed`, records the failed operation and every completed one in the audit log, and leaves undo available for completed operations.
- **`ETAG_MISMATCH` is per-operation.** Skip that operation, record it as `skipped` with the reason, continue the run, and surface it in the run summary.

```ts
// ❌ swallow
try {
  await provider.deleteContact(ref);
} catch {}

// ❌ leak PII in message
throw new Error(`Could not delete ${contact.displayName} <${contact.emails[0]?.value}>`);

// ✅
try {
  await provider.deleteContact(ref);
} catch (error) {
  throw new ProviderError("PROVIDER_UNAVAILABLE", "Delete failed", {
    cause: error,
    isRetryable: true,
    details: { accountId: ref.accountId, operationIndex: index },
  });
}
```

## 5. PII and secret redaction

The following must **never** appear in logs, error messages, error `details`, crash output, or test snapshots:

| Category     | Examples                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Secrets      | OAuth access/refresh tokens, authorization codes, PKCE verifiers, client secrets, `Authorization` headers, cookies            |
| Contact PII  | display/given/family names, emails, phone numbers, addresses, birthdays, notes, photos, organization names, group/label names |
| Account PII  | the connected Google account's email address and name                                                                         |
| Raw payloads | request/response bodies to or from providers, vCard/CSV contents                                                              |

Safe to log: internal IDs (`accountId`, `snapshotId`, `runId`), provider resource IDs (`people/c123…`), counts, durations, error codes, HTTP status codes, route templates (`/api/v1/accounts/:id`, not the concrete URL with query strings).

Enforcement:

- pino is configured with `redact` paths for `req.headers.authorization`, `req.headers.cookie`, `*.token`, `*.accessToken`, `*.refreshToken`, `*.email`, `*.phone`, `*.displayName`, `*.contact`, `*.body`.
- Request logging logs `method`, route template, status code, duration — never bodies or query strings.
- In the UI, show the account's email (the user's own data on their own machine); in logs, use the `accountId`.
- A unit test asserts redaction for each path above.

## 6. Logging

- **Logger:** pino (Fastify's built-in logger), structured JSON. Pretty-printed in dev via `pino-pretty`.
- **Level** from `CONTACT_FUSE_LOG_LEVEL` (default `info`; tests `silent`).
- **Destination:** stdout, plus a rotating file in the data dir (`<data-dir>/logs/`), kept 7 days — so users can attach logs to bug reports. Logs never leave the machine automatically (no telemetry).
- **Use child loggers** with context: `logger.child({ runId })`.
- **Message style:** lowercase, past tense or present-progressive, stable text; variable data goes in fields.

```ts
// ❌
logger.info(`Merged ${n} contacts into ${mainAccount.email}`);

// ✅
logger.info({ runId, mergedCount: n, accountId: mainAccount.id }, "merge run completed");
```

| Level   | Use for                       | Example                                                   |
| ------- | ----------------------------- | --------------------------------------------------------- |
| `fatal` | process cannot continue       | cannot open database                                      |
| `error` | operation failed, user impact | run failed; unhandled exception                           |
| `warn`  | unexpected but handled        | etag mismatch skipped; retrying after 429                 |
| `info`  | lifecycle events              | server started; snapshot created; run applied; run undone |
| `debug` | developer detail              | batch sizes, timings, page counts                         |
| `trace` | very verbose internals        | per-operation progress (still no PII)                     |

## 7. User-facing errors

- The API returns `{ error: { code, message, details? } }` (see [api-design.md](api-design.md#7-errors)).
- The web app maps `code` → human copy from [content-style-guide.md](../design/content-style-guide.md); it never shows raw `message` or stack traces.
- Every error message to the user answers three questions: **What happened? Are my contacts safe? What can I do?**
  - ✅ "Google is limiting requests right now. Nothing was changed. We'll retry automatically — or try again in a few minutes."
  - ❌ "Error 429: RESOURCE_EXHAUSTED"
