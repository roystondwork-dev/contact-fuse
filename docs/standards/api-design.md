# API Design

The local Fastify server (`apps/server`) exposes a JSON HTTP API consumed by the web app (`apps/web`). It is local-only, but we design it like a public API: versioned, consistent and documented, so the UI stays simple and future clients (a CLI, automation scripts) can use it safely.

Related: [naming-conventions.md](naming-conventions.md#6-http-api) · [error-handling-and-logging.md](error-handling-and-logging.md) · [security-and-privacy.md](../architecture/security-and-privacy.md) · [merge-engine.md](../architecture/merge-engine.md)

## Contents

1. [Basics](#1-basics)
2. [Versioning](#2-versioning)
3. [Resources](#3-resources)
4. [Requests and responses](#4-requests-and-responses)
5. [Pagination](#5-pagination)
6. [Long-running jobs](#6-long-running-jobs)
7. [Errors](#7-errors)
8. [Idempotency](#8-idempotency)
9. [Concurrency control](#9-concurrency-control)
10. [Security](#10-security)
11. [Schemas and documentation](#11-schemas-and-documentation)

---

## 1. Basics

- Base URL: `http://127.0.0.1:4317/api/v1` (port from `CONTACT_FUSE_PORT`). The server binds to loopback only.
- Content type: `application/json; charset=utf-8` for requests and responses; `text/event-stream` for progress streams; `text/vcard` / `text/csv` for exports.
- Field names: camelCase. Timestamps: ISO-8601 UTC strings (`2026-10-11T09:30:00.000Z`). IDs: opaque strings (UUIDv7).
- `GET /api/health` (unversioned) returns `{ "status": "ok" }` for liveness checks.

## 2. Versioning

- Major version in the path: `/api/v1`. Breaking changes require `/api/v2`, served alongside v1 for at least one minor release.
- Non-breaking (allowed in v1): adding endpoints, adding optional request fields, adding response fields, adding error codes.
- Breaking (requires v2): removing/renaming fields or endpoints, changing types or semantics, making optional fields required.
- Clients must ignore unknown response fields.

## 3. Resources

Nouns, plural, kebab-case. Actions that are not CRUD are modelled as **sub-resources that get created** (a run is created, not "executed").

| Method & path                                                     | Purpose                                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| `GET /accounts`                                                   | list connected accounts                                          |
| `POST /accounts/oauth/start`                                      | begin OAuth flow → `{ authorizationUrl }`                        |
| `GET /accounts/oauth/callback`                                    | OAuth loopback redirect target (browser)                         |
| `PATCH /accounts/:id`                                             | update (e.g. `{ isMain: true }`)                                 |
| `DELETE /accounts/:id`                                            | disconnect account (removes tokens; never touches provider data) |
| `POST /snapshots`                                                 | take a snapshot of all accounts → 202 + job                      |
| `GET /snapshots` / `GET /snapshots/:id`                           | list / get snapshot metadata                                     |
| `GET /snapshots/:id/export?format=vcard\|csv`                     | download backup                                                  |
| `POST /scans`                                                     | run the matching engine on a snapshot → 202 + job                |
| `GET /scans/:id/clusters?confidence=high`                         | list clusters (paginated)                                        |
| `PATCH /scans/:id/clusters/:clusterId`                            | approve / reject / edit survivor                                 |
| `POST /merge-plans`                                               | build a plan (dry run) from approved clusters + rules            |
| `GET /merge-plans/:id`                                            | plan summary + counts                                            |
| `GET /merge-plans/:id/operations`                                 | plan operations (paginated)                                      |
| `POST /merge-plans/:id/runs`                                      | apply the plan → 202 + run (idempotent)                          |
| `GET /runs/:id`                                                   | run status and summary                                           |
| `GET /runs/:id/events`                                            | SSE progress stream                                              |
| `POST /runs/:id/undo`                                             | create an undo run → 202                                         |
| `GET /settings` / `PUT /settings`                                 | merge rules, thresholds, cleanup policy, default region          |
| `GET /exclusions` / `POST /exclusions` / `DELETE /exclusions/:id` | manage exclusions                                                |
| `GET /jobs/:id`                                                   | generic job status                                               |

## 4. Requests and responses

- Single resource: return the object directly — `{ "id": "…", "isMain": true, … }`.
- Collections: `{ "items": [...], "nextCursor": "…" | null }`.
- Creation: `201 Created` with the resource (or `202 Accepted` for jobs, see §6).
- Updates: `PATCH` for partial updates, `PUT` only for full replacement (settings).
- Deletion: `204 No Content`.
- Booleans in JSON are real booleans; never `"true"` strings. Omit absent optional fields rather than sending `null`, except `nextCursor`.

| Status    | Use                                                                  |
| --------- | -------------------------------------------------------------------- |
| 200       | successful read/update                                               |
| 201       | resource created synchronously                                       |
| 202       | job accepted (async)                                                 |
| 204       | success, no body                                                     |
| 400       | malformed request / validation failed                                |
| 401       | account needs (re)connection                                         |
| 404       | not found                                                            |
| 409       | conflict (run in progress, already applied, outdated)                |
| 412       | precondition not met (no snapshot, no main account, no OAuth client) |
| 422       | semantically invalid settings                                        |
| 500       | internal error                                                       |
| 502 / 503 | provider failed / rate-limited                                       |

## 5. Pagination

Cursor-based for all collections that can exceed 100 items (clusters, operations, audit entries).

- Request: `?pageSize=50&cursor=<opaque>`; `pageSize` default 50, max 200.
- Response: `{ "items": [...], "nextCursor": "eyJ…" | null }`. `null` means last page.
- Cursors are opaque (base64url-encoded JSON of the sort key); clients must not parse them.
- Sort order is stable and documented per endpoint (default: `createdAt` then `id`).

Why cursors, not offsets: lists can change while the user reviews them (approving a cluster moves it), and offsets skip or duplicate items.

## 6. Long-running jobs

Snapshots, scans, runs and undos can take minutes for large address books.

1. `POST` returns **`202 Accepted`** with a job resource and a `Location` header:

```json
{ "id": "01J…", "kind": "run", "status": "queued", "progress": { "done": 0, "total": 1240 } }
```

2. Status values: `queued` → `running` → `succeeded` | `failed` | `cancelled` (runs may also end `partially-succeeded` when operations were skipped).
3. Clients **stream progress via Server-Sent Events** at `GET /runs/:id/events` (or `/jobs/:id/events`):

```
event: progress
data: {"done":120,"total":1240,"skipped":2}

event: completed
data: {"status":"succeeded","summary":{"created":40,"updated":75,"deleted":0,"skipped":2}}
```

4. Clients may fall back to polling `GET /jobs/:id`. SSE events carry counts and IDs only — never contact data.
5. Cancellation: `POST /jobs/:id/cancel`. A cancelled run stops after the current batch and remains undoable.
6. Only one write job (run/undo) may be active at a time → `409 RUN_IN_PROGRESS`.

## 7. Errors

Every non-2xx response has this shape:

```json
{
  "error": {
    "code": "PLAN_OUTDATED",
    "message": "Contacts changed since this plan was built.",
    "details": { "planId": "01J…", "changedContacts": 3 }
  }
}
```

- `code`: stable UPPER_SNAKE_CASE from the [error code catalog](error-handling-and-logging.md#3-error-code-catalog).
- `message`: developer-facing English, no PII; the UI does not display it verbatim.
- `details`: optional, primitives only. For `VALIDATION_FAILED`: `{ "fields": "body.rules.phones: Invalid enum value" }` style summaries without user-entered values.

## 8. Idempotency

Applying a plan is the most dangerous call in the system; a double-click or retry must never apply it twice.

- `POST /merge-plans/:id/runs` and `POST /runs/:id/undo` **require** an `Idempotency-Key` header (UUID generated by the client per user action).
- The server stores the key with the created run. A repeated request with the same key returns the **original response** (`202` with the same run), not a new run.
- Same key with a different plan → `409 RUN_ALREADY_APPLIED`.
- Missing key → `400 VALIDATION_FAILED`.
- Keys are retained for 30 days.

## 9. Concurrency control

- Plans record the snapshot they were built from. Applying a plan whose snapshot is no longer current returns `409 PLAN_OUTDATED`; the UI offers to rescan.
- Per-contact writes to Google send the snapshot `etag`; a mismatch skips that operation (`ETAG_MISMATCH`) rather than overwriting someone's newer edit.
- Mutable local resources (`PATCH /scans/:id/clusters/:clusterId`, `PUT /settings`) accept `If-Match` with the resource's `version` to prevent lost updates between browser tabs.

## 10. Security

Full threat model in [security-and-privacy.md](../architecture/security-and-privacy.md). API-level rules:

- Bind to `127.0.0.1` only; reject requests whose `Host` header is not `127.0.0.1:<port>` or `localhost:<port>` (DNS-rebinding defence).
- Reject state-changing requests whose `Origin` is not the app's own origin (CSRF defence for a localhost server).
- No CORS: the API is same-origin with the web UI.
- A per-launch random session token is issued to the UI and required on every API call.
- Never return tokens or OAuth secrets in any response.

## 11. Schemas and documentation

- Every route declares Zod schemas for params, query, body and response; types are inferred from the schemas (no hand-written duplicates).
- Request/response schemas shared with the web app live in `apps/server/src/schemas/*.schema.ts` and are imported by the web app as **types only**.
- An OpenAPI document is generated from the schemas in dev builds (`/api/v1/openapi.json`) and checked into `docs/` on release.
