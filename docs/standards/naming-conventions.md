# Naming Conventions

Consistent names make the codebase searchable and reviews faster. This document is the single source of truth for naming across code, files, the database, the HTTP API, git, and design tokens. When this document and existing code disagree, this document wins and the code should be fixed.

Related: [coding-standards.md](coding-standards.md) · [database.md](database.md) · [api-design.md](api-design.md) · [git-workflow.md](../process/git-workflow.md) · [glossary.md](../product/glossary.md)

## Contents

1. [Quick reference](#1-quick-reference)
2. [Files and folders](#2-files-and-folders)
3. [Code identifiers](#3-code-identifiers)
4. [Domain vocabulary](#4-domain-vocabulary)
5. [Database](#5-database)
6. [HTTP API](#6-http-api)
7. [Git](#7-git)
8. [Design tokens and CSS](#8-design-tokens-and-css)
9. [Packages and environment](#9-packages-and-environment)

---

## 1. Quick reference

| Thing                         | Convention                                         | Example                                                 |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| Source files                  | kebab-case                                         | `merge-planner.ts`                                      |
| React component files         | kebab-case                                         | `merge-review-card.tsx`                                 |
| Test files                    | `<name>.test.ts(x)` next to source                 | `merge-planner.test.ts`                                 |
| E2E test files                | `<flow>.spec.ts` in `apps/web/e2e/`                | `connect-account.spec.ts`                               |
| Folders                       | kebab-case                                         | `provider-google/`, `merge-plans/`                      |
| Root community docs           | UPPER_CASE.md                                      | `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `SKILL.md` |
| Other docs                    | kebab-case.md                                      | `error-handling-and-logging.md`                         |
| ADRs                          | `NNNN-kebab-title.md`                              | `0005-sqlite-with-drizzle.md`                           |
| React components              | PascalCase                                         | `MergeReviewCard`                                       |
| React hooks                   | `use` + PascalCase                                 | `useMergePlan`, `useAccounts`                           |
| Component props type          | `<Component>Props`                                 | `MergeReviewCardProps`                                  |
| Types / interfaces / classes  | PascalCase, no `I` prefix                          | `Contact`, `MergePlan`                                  |
| Branded ID types              | `<Entity>Id`                                       | `AccountId`, `SnapshotId`                               |
| Zod schemas                   | PascalCase + `Schema`                              | `ContactSchema`                                         |
| Error classes                 | PascalCase + `Error`                               | `TokenExpiredError`                                     |
| Error codes                   | UPPER_SNAKE_CASE                                   | `TOKEN_EXPIRED`                                         |
| Functions                     | camelCase, verb first                              | `normalizePhone`, `buildMergePlan`                      |
| Variables                     | camelCase, noun                                    | `mainAccount`, `clusters`                               |
| Booleans                      | `is` / `has` / `should` / `can` prefix             | `isMain`, `hasConflicts`                                |
| Module constants              | UPPER_SNAKE_CASE                                   | `DEFAULT_PORT`, `MAX_BATCH_SIZE`                        |
| `as const` enum objects       | UPPER_SNAKE object, PascalCase type                | `CONFIDENCE` / `Confidence`                             |
| Generic type params           | `T`, or `T` + descriptive                          | `T`, `TContact`                                         |
| Event handlers (props)        | `on` + Event                                       | `onApprove`                                             |
| Event handlers (impl)         | `handle` + Event                                   | `handleApprove`                                         |
| DB tables                     | snake_case, plural                                 | `merge_runs`                                            |
| DB columns                    | snake_case                                         | `created_at`, `account_id`                              |
| Drizzle table objects         | camelCase plural                                   | `mergeRuns`                                             |
| API paths                     | `/api/v1/` + plural kebab-case                     | `/api/v1/merge-plans/:id/runs`                          |
| JSON fields                   | camelCase                                          | `mainAccountId`                                         |
| Query params                  | camelCase                                          | `?pageSize=50&cursor=…`                                 |
| Env vars                      | `CONTACT_FUSE_` + UPPER_SNAKE                      | `CONTACT_FUSE_PORT`                                     |
| npm packages (internal)       | `@contact-fuse/<kebab>`                            | `@contact-fuse/provider-google`                         |
| npm package (published)       | `contact-fuse`                                     | `npx contact-fuse`                                      |
| Git branches                  | `<type>/<short-kebab-desc>`                        | `feat/fuzzy-name-matching`                              |
| Commits                       | Conventional Commits                               | `fix(core): keep all phones on union`                   |
| Test names                    | `it("<does X> when <Y>")`                          | `it("merges phones when rule is union")`                |
| CSS tokens                    | `--color-<role>`, `--space-<n>`, `--radius-<size>` | `--color-danger`                                        |
| Tailwind classes using tokens | role-based                                         | `bg-surface text-muted`                                 |

## 2. Files and folders

- **kebab-case for every file and folder** in source, including React components. Rationale: macOS and Windows file systems are case-insensitive, so `MergeCard.tsx` vs `mergeCard.tsx` renames break git; kebab-case avoids it entirely.
- A file is named after its **main export**: `merge-planner.ts` exports `buildMergePlan`/`MergePlanner`; `merge-review-card.tsx` exports `MergeReviewCard`.
- Suffixes for special roles:

| Suffix         | Meaning                    | Example               |
| -------------- | -------------------------- | --------------------- |
| `.test.ts`     | unit/integration test      | `score.test.ts`       |
| `.spec.ts`     | Playwright e2e test        | `merge-flow.spec.ts`  |
| `.schema.ts`   | Zod schemas for a resource | `accounts.schema.ts`  |
| `.fixtures.ts` | test builders/fixtures     | `contact.fixtures.ts` |
| `.config.ts`   | tool config                | `vite.config.ts`      |

- ❌ Avoid vague names: `utils.ts`, `helpers.ts`, `misc.ts`, `common.ts`. ✅ Name by purpose: `phone-normalization.ts`, `retry-with-backoff.ts`.

## 3. Code identifiers

### Functions — verb first

| Verb               | Use for                                                       |
| ------------------ | ------------------------------------------------------------- |
| `get`              | cheap, synchronous read that cannot fail meaningfully         |
| `fetch`            | network call to a provider                                    |
| `load` / `save`    | DB read / write                                               |
| `find`             | lookup that may return `undefined`                            |
| `build` / `create` | construct a new value                                         |
| `normalize`        | canonicalize a value for comparison                           |
| `parse`            | validate unknown input into a typed value (throws on invalid) |
| `to<X>`            | pure conversion (`toE164`, `toVCard`)                         |
| `is` / `has`       | boolean predicate                                             |
| `assert`           | throws if a condition fails                                   |

```ts
// ❌
function phone(p: string) {}
function data() {}

// ✅
function normalizePhone(raw: string, region: RegionCode): E164 | undefined {}
async function fetchContacts(account: Account): Promise<Contact[]> {}
```

### Booleans

```ts
// ❌
const main = true; const conflict = ops.some(...);
// ✅
const isMain = true; const hasConflicts = ops.some(...);
```

Avoid negatives (`isNotMain`, `disableX`) — they create double negations.

### Abbreviations

Treat acronyms as words in camelCase/PascalCase: `normalizeE164`, `OauthClient`, `ApiError`, `vcardExport` (not `OAuthClient`, `APIError`). Allowed short forms: `id`, `db`, `url`, `api`, `ui`. No other abbreviations (`acct`, `cnt`, `mgr`).

## 4. Domain vocabulary

Use the exact terms from the [glossary](../product/glossary.md) in code, UI, docs and API — never synonyms.

| Use                                                                        | Not                                         |
| -------------------------------------------------------------------------- | ------------------------------------------- |
| `account`                                                                  | profile, user, mailbox                      |
| `mainAccount`                                                              | primary, target, master                     |
| `sourceAccounts`                                                           | secondary, other                            |
| `contact`                                                                  | person, entry, record                       |
| `snapshot`                                                                 | backup (in code); "backup" is OK in UI copy |
| `scan`                                                                     | analysis, check                             |
| `match`                                                                    | pair, hit                                   |
| `cluster`                                                                  | group, set                                  |
| `survivor`                                                                 | winner, result                              |
| `mergePlan`                                                                | preview, diff                               |
| `run`                                                                      | job, execution (for merge execution)        |
| `exclusion`                                                                | ignore list, blacklist                      |
| `confidence`                                                               | certainty, probability                      |
| `cleanupPolicy` (`keep` / `label` / `delete`)                              | —                                           |
| merge rule strategies `prefer-main` / `newest` / `most-complete` / `union` | —                                           |

## 5. Database

See [database.md](database.md) for full conventions.

| Element      | Convention                                        | Example                             |
| ------------ | ------------------------------------------------- | ----------------------------------- |
| Table        | snake_case, plural                                | `snapshot_contacts`                 |
| Column       | snake_case                                        | `display_name`                      |
| Primary key  | `id` (text, UUIDv7)                               | `id`                                |
| Foreign key  | `<singular_table>_id`                             | `snapshot_id`                       |
| Timestamps   | `<verb>_at`, ISO-8601 UTC text                    | `created_at`, `applied_at`          |
| Booleans     | `is_` / `has_` prefix, integer 0/1                | `is_main`                           |
| Index        | `<table>_<columns>_idx`                           | `matches_scan_id_idx`               |
| Unique index | `<table>_<columns>_key`                           | `accounts_provider_external_id_key` |
| Migrations   | generated by drizzle-kit, `NNNN_<kebab_desc>.sql` | `0003_add_exclusions.sql`           |

## 6. HTTP API

See [api-design.md](api-design.md).

- Paths: `/api/v1/<plural-kebab-noun>[/:id[/<sub-resource>]]`.
- Actions that are not CRUD become sub-resources, not verbs: ✅ `POST /api/v1/merge-plans/:id/runs`, ❌ `POST /api/v1/executeMergePlan`.
- JSON fields and query params: camelCase. Error codes: UPPER_SNAKE_CASE.

## 7. Git

See [git-workflow.md](../process/git-workflow.md).

- Branches: `<type>/<short-kebab-desc>` with type ∈ `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`, `build`. Example: `fix/union-rule-drops-labels`.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <imperative summary>`. Scopes = package or area: `core`, `provider-google`, `server`, `web`, `db`, `docs`, `ci`, `deps`.

## 8. Design tokens and CSS

See [design-system.md](../design/design-system.md).

- Tokens are **semantic** (what they are for), not literal (what they look like): ✅ `--color-danger`, ❌ `--color-red-600` in components.
- Pattern: `--<category>-<role>[-<variant>]` → `--color-primary`, `--color-primary-hover`, `--color-confidence-high`, `--radius-md`.
- Custom component classes (rare; prefer Tailwind utilities): kebab-case, prefixed `cf-` (`cf-diff-row`).

## 9. Packages and environment

- Internal workspace packages: `@contact-fuse/<kebab-name>`, `"private": true`. Folders: `apps/<name>` for runnable apps, `packages/<name>` for libraries. Providers: `packages/provider-<id>` where `<id>` is the provider ID used in code (`google`, `carddav`, `microsoft`).
- Published package: `contact-fuse` only.
- Environment variables: `CONTACT_FUSE_<NAME>` — e.g. `CONTACT_FUSE_PORT`, `CONTACT_FUSE_DATA_DIR`, `CONTACT_FUSE_LOG_LEVEL`, `CONTACT_FUSE_DEFAULT_REGION`, `CONTACT_FUSE_DEV_UI_ORIGIN`. Third-party standard variables (`NODE_ENV`, `CI`) keep their names.
