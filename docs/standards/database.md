# Database

contact-fuse keeps all local state — snapshots, scans, merge plans, runs and the audit log — in a single SQLite file on the user's machine. This document covers schema conventions, the migration workflow, and the initial set of tables. The database is the user's safety net (it holds the backups and undo history), so changes to it are treated with extra care.

Related: [data-model.md](../architecture/data-model.md) · [naming-conventions.md](naming-conventions.md#5-database) · [0005-sqlite-with-drizzle.md](../adr/0005-sqlite-with-drizzle.md) · [security-and-privacy.md](../architecture/security-and-privacy.md)

## Contents

1. [Stack and location](#1-stack-and-location)
2. [Schema conventions](#2-schema-conventions)
3. [Initial tables](#3-initial-tables)
4. [Migrations](#4-migrations)
5. [Access patterns](#5-access-patterns)
6. [Data retention and deletion](#6-data-retention-and-deletion)

---

## 1. Stack and location

| Concern             | Choice                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine              | SQLite via `better-sqlite3` (synchronous, fast, embedded)                                                                                                                           |
| ORM / query builder | Drizzle ORM                                                                                                                                                                         |
| Migrations          | `drizzle-kit generate`, SQL files committed to git                                                                                                                                  |
| Code location       | `apps/server/src/db/` (`schema.ts`, `migrations/`, `repositories/`, `client.ts`)                                                                                                    |
| File location       | `<data-dir>/contact-fuse.sqlite`; data dir from `env-paths("contact-fuse")` — e.g. `~/Library/Application Support/contact-fuse` on macOS — overridable with `CONTACT_FUSE_DATA_DIR` |
| Pragmas on open     | `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`, `synchronous = NORMAL`                                                                                            |
| File permissions    | data dir `0700`, DB file `0600`                                                                                                                                                     |

OAuth tokens are **not** stored in the database — they live in the OS keychain.

## 2. Schema conventions

| Rule                                                                       | Example                                                  | Why                                               |
| -------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| Tables snake_case, plural                                                  | `merge_runs`                                             | consistency with SQL norms                        |
| Columns snake_case                                                         | `display_name`                                           | —                                                 |
| Drizzle objects camelCase                                                  | `export const mergeRuns = sqliteTable("merge_runs", …)`  | TS convention                                     |
| PK `id TEXT`, UUIDv7                                                       | `01928f3a-…`                                             | sortable by time, globally unique, safe to expose |
| FK `<singular>_id` with `ON DELETE` declared                               | `snapshot_id REFERENCES snapshots(id) ON DELETE CASCADE` | explicit lifecycle                                |
| Timestamps `<verb>_at` as ISO-8601 UTC `TEXT`                              | `created_at`, `applied_at`                               | readable, sortable                                |
| Every table has `created_at`; mutable tables add `updated_at`              | —                                                        | auditing                                          |
| Booleans `is_`/`has_` prefix, `INTEGER` 0/1 with Drizzle `mode: "boolean"` | `is_main`                                                | —                                                 |
| Enum-like columns `TEXT` + `CHECK` constraint                              | `status TEXT CHECK (status IN ('queued','running',…))`   | DB enforces valid states                          |
| Structured blobs `TEXT` JSON validated by Zod on read                      | `contact_json`, `rules_json`                             | flexible, but never trusted blindly               |
| Indexes named `<table>_<cols>_idx`; unique `<table>_<cols>_key`            | `matches_scan_id_idx`                                    | readable plans and errors                         |
| No nullable columns without a reason                                       | —                                                        | fewer states to handle                            |

## 3. Initial tables

Conceptual only. **[data-model.md](../architecture/data-model.md) is the authoritative column list** and `apps/server/src/db/schema.ts` implements it; where this table differs, data-model.md wins.

| Table               | Purpose                                     | Key columns                                                                                                                                                  |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `accounts`          | connected accounts                          | `id`, `provider` (`google`), `external_id`, `display_label`, `is_main`, `status` (`connected`/`needs-reauth`/`disconnected`), `last_synced_at`, `sync_token` |
| `snapshots`         | one backup across all accounts              | `id`, `status`, `contact_count`, `created_at`, `completed_at`                                                                                                |
| `snapshot_contacts` | every contact in a snapshot, canonical form | `id`, `snapshot_id`, `account_id`, `resource_id`, `etag`, `contact_json`, `raw_json` (provider original, for exact restore)                                  |
| `scans`             | a matching run over a snapshot              | `id`, `snapshot_id`, `settings_json` (thresholds used), `status`, `cluster_count`                                                                            |
| `clusters`          | groups believed to be the same person       | `id`, `scan_id`, `confidence`, `score`, `decision` (`pending`/`approved`/`rejected`), `survivor_json`, `version`                                             |
| `cluster_members`   | contacts in a cluster                       | `cluster_id`, `snapshot_contact_id`                                                                                                                          |
| `matches`           | scored pairs with reasons (explainability)  | `id`, `scan_id`, `contact_a_id`, `contact_b_id`, `score`, `reasons_json`                                                                                     |
| `merge_plans`       | a dry-run plan                              | `id`, `scan_id`, `snapshot_id`, `main_account_id`, `rules_json`, `cleanup_policy`, `summary_json`                                                            |
| `merge_operations`  | ordered operations in a plan                | `id`, `merge_plan_id`, `sequence`, `kind` (`create`/`update`/`delete`/`label`), `target_account_id`, `resource_id`, `payload_json`, `expected_etag`          |
| `merge_runs`        | an execution of a plan (or an undo)         | `id`, `merge_plan_id`, `kind` (`apply`/`undo`), `undoes_run_id`, `idempotency_key` (unique), `status`, `started_at`, `finished_at`, `summary_json`           |
| `audit_log`         | append-only record of every provider write  | `id`, `merge_run_id`, `merge_operation_id`, `result` (`succeeded`/`failed`/`skipped`), `error_code`, `before_json`, `after_json`, `new_etag`, `created_at`   |
| `exclusions`        | contacts/labels never to merge              | `id`, `kind` (`contact`/`label`), `account_id`, `value`                                                                                                      |
| `settings`          | key/value app settings                      | `key` (PK), `value_json`, `updated_at`                                                                                                                       |

Invariants enforced in code and tested:

- `audit_log` is **append-only**: no `UPDATE` or `DELETE` statements on it except when the user deletes all local data.
- Exactly one account may have `is_main = 1` (partial unique index).
- A `merge_run` with `kind = 'apply'` references a plan whose `snapshot_id` has `status = 'completed'`.

## 4. Migrations

1. Edit the Drizzle schema in `apps/server/src/db/schema.ts`, and the column list in [data-model.md](../architecture/data-model.md).
2. Generate: `pnpm --filter @contact-fuse/server db:generate` → new SQL file in `src/db/migrations/`.
3. **Read the generated SQL.** drizzle-kit can produce table rebuilds for SQLite; confirm no data is dropped.
4. Commit schema change and migration together in the same PR.
5. Migrations run automatically at server startup, inside a transaction, after a **file-level backup** of the DB (`contact-fuse.sqlite.bak-<timestamp>`).

Rules:

- **Never edit a migration that has been released.** Add a new one.
- **Forward-only.** No down migrations; recovery is via the pre-migration backup.
- Destructive changes (dropping a column/table with user data) need an ADR or explicit maintainer approval, and a data-preserving path (copy → verify → drop in a later release).
- Every migration is tested: CI applies all migrations to an empty DB and to a fixture DB from the previous release.

## 5. Access patterns

- All queries go through **repositories** in `src/db/repositories/` (`accounts-repository.ts`, …). Routes and services never write raw SQL.
- Use Drizzle's query builder; raw SQL (`sql\`…\``) only with bound parameters — never string concatenation.
- Multi-statement changes (e.g. creating a plan + its operations) run in a **transaction**.
- JSON columns are parsed with the matching Zod schema on read; a parse failure raises `STORAGE_FAILED` rather than returning malformed data.
- Large reads (snapshot contacts) are streamed/iterated, not loaded fully into memory when > 10k rows.

## 6. Data retention and deletion

- Snapshots are kept until the user deletes them; the UI warns before deleting a snapshot that an undoable run depends on.
- The app provides "Delete all local data", which removes the DB file, logs, and keychain entries.
- Disconnecting an account removes its tokens; its snapshot rows remain (they are the user's backup) unless the user chooses to delete them.
