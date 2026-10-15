# 0005. SQLite with Drizzle ORM for local persistence

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** maintainers

## Context

We must persist snapshots (thousands of contacts with raw payloads), scans, user decisions, plans, runs
and an append-only audit log that powers undo. Data must survive restarts and crashes mid-run. Users
must not install or configure a database.

## Decision

We will use **SQLite** (via `better-sqlite3`) with **Drizzle ORM**. The schema lives in
`apps/server/src/db/schema.ts`; migrations are generated with `drizzle-kit`, committed under
`apps/server/drizzle/` and applied automatically on startup. The DB file lives in the OS app-data
directory (resolved with `env-paths`, override `CONTACT_FUSE_DATA_DIR`). WAL mode is enabled.
Conventions are in the [database standard](../standards/database.md).

## Consequences

- Positive: zero setup, single file, transactional — writes of a batch and its audit rows commit together.
- Positive: Drizzle gives typed queries with SQL-like syntax and no runtime query engine.
- Negative: `better-sqlite3` is a native module; prebuilt binaries cover mainstream platforms, others
  need a compiler. pnpm must be allowed to run its build script.
- Negative: no encryption at rest in v1 (see [security and privacy](../architecture/security-and-privacy.md#data-at-rest)).
- Follow-ups: evaluate Node's built-in `node:sqlite` once stable to drop the native dependency.

## Alternatives considered

| Option        | Why not                                                                                 |
| ------------- | --------------------------------------------------------------------------------------- |
| JSON files    | No transactions; corruption risk mid-run; slow queries                                  |
| PostgreSQL    | Requires a server — unacceptable for a one-command local app                            |
| Prisma        | Heavier engine and generation step; slower startup                                      |
| Kysely        | Good query builder, but Drizzle's schema + migrations story is simpler for contributors |
| `node:sqlite` | Still evolving; revisit later                                                           |
