# CLAUDE.md

Project memory for Claude Code. Keep this file short. Link to docs instead of copying them.

## What this is

**contact-fuse** is an open-source, **local-first** web app. It connects multiple Google accounts,
takes a backup (**snapshot**), finds duplicate contacts across accounts (**scan** → **matches** →
**clusters**), lets the user review them, shows a **dry run** of the **merge plan**, then applies it
to one **main account**. Each **run** is written to an **audit log** and can be **undone**.
Status: pre-alpha, milestone M0. Terms: [docs/product/glossary.md](docs/product/glossary.md).

## Stack

- TypeScript (strict, ESM), Node ≥ 22 (`.nvmrc` = 24), pnpm 12 workspaces (via corepack)
- `apps/server`: Fastify + pino + Zod, Drizzle + better-sqlite3, runs on **127.0.0.1:4317 only**
- `apps/web`: React + Vite + Tailwind v4 + shadcn/ui + lucide-react + TanStack Query (dev port 5173, proxies `/api`)
- `packages/core`: pure domain logic (model, normalisation, matching, merge planning)
- `packages/provider-google`: Google People API (`googleapis`), OAuth loopback + PKCE
- Tests: Vitest (colocated `*.test.ts`), MSW for Google HTTP, Playwright e2e (`apps/web/e2e/*.spec.ts`)

## Commands

```sh
pnpm install          # install (CI: --frozen-lockfile)
pnpm dev              # server + web in watch mode
pnpm test             # Vitest, all projects
pnpm typecheck        # tsc in every package
pnpm lint             # ESLint
pnpm format           # Prettier write
pnpm check            # format:check + lint + typecheck + test (run before every PR)
pnpm build            # build all packages
pnpm changeset        # describe a user-facing change
```

## Layout

```
apps/server/src/       Fastify app, routes, db/ (Drizzle schema + migrations), OAuth, jobs
apps/web/src/          React UI
packages/core/src/     Contact model, normalize, matching, merge planning (NO I/O)
packages/provider-*/   Provider adapters mapping to/from the canonical Contact
docs/                  All documentation (index: docs/README.md)
.claude/skills/        Task playbooks (add-provider, write-tests, new-adr, ui-component, pre-pr-check)
```

Full tree: [docs/architecture/project-structure.md](docs/architecture/project-structure.md).

## Golden rules

1. **Never log, commit or put PII or tokens in fixtures:** names, emails, phones, OAuth tokens. Log IDs
   and counts. Fixtures are synthetic only. See [error handling and logging](docs/standards/error-handling-and-logging.md).
2. **`packages/core` has no I/O.** No fs, network, DB, timers or provider SDKs. It must be pure and deterministic.
3. **Safety model is sacred:** snapshot before any write → user-approved clusters → dry run →
   execute with audit log → undo. Source accounts default to the `keep` cleanup policy. Respect etags.
   See [merge engine](docs/architecture/merge-engine.md) and [ADR 0008](docs/adr/0008-safety-first-merge-model.md).
4. **Local only:** bind to `127.0.0.1`, no telemetry, and no remote fonts, CDNs or analytics.
5. **Tokens go in the OS keychain** (`@napi-rs/keyring`), never in files, the DB or logs.
6. **Validate external input with Zod** at boundaries. Throw `ContactFuseError` (with a `code`), never strings.
7. **Providers map to the canonical `Contact`.** Core never sees provider types.

## Conventions (summary)

- Files and folders use **kebab-case**, including React components (`merge-review-card.tsx`).
- **Named exports only.** Default exports are allowed only in tool config files.
- Types and components use PascalCase (no `I` prefix). Functions are camelCase verbs. Booleans use `is`/`has`/`should`/`can`.
  Constants use UPPER_SNAKE_CASE. Use `as const` objects instead of TS `enum`.
- DB uses snake_case plural tables. The API is `/api/v1/<plural-kebab>` with camelCase JSON, and errors look like `{ error: { code, message } }`.
- Env vars use the `CONTACT_FUSE_*` prefix.
- Commits use Conventional Commits. Branches are `<type>/<short-kebab-desc>`, and PRs are squash-merged.
- Details: [naming](docs/standards/naming-conventions.md) · [coding](docs/standards/coding-standards.md) ·
  [API](docs/standards/api-design.md) · [database](docs/standards/database.md) · [git](docs/process/git-workflow.md)

## Testing expectations

- Every behaviour change ships with tests in the same PR. Bug fixes start with a failing test.
- `core` aims for ≥ 90% line coverage. Server and providers aim for ≥ 75% (see docs/standards/testing.md).
- Never call the real Google API in tests. Use MSW.
- Details: [docs/standards/testing.md](docs/standards/testing.md)

## UI

Use semantic design tokens only (`bg-surface`, `text-danger`…), with no raw hex or Tailwind palette colours in
components. Use the system font stack. Support light and dark mode. Meet WCAG 2.2 AA, and never show
confidence or destructive meaning by colour alone. See [design system](docs/design/design-system.md) ·
[UI guidelines](docs/design/ui-guidelines.md) · [content style](docs/design/content-style-guide.md).

## Where things are decided

- Architecture decisions: [docs/adr/](docs/adr/README.md). Add a new ADR for significant changes (skill: `new-adr`).
- Done means: [docs/process/definition-of-done.md](docs/process/definition-of-done.md)
- Dependency policy (TypeScript is pinned to 6.0.x until typescript-eslint supports TS 7):
  [docs/standards/dependencies.md](docs/standards/dependencies.md)

## Maintainer context

The maintainer is new to macOS. When giving setup or shell instructions, explain Mac-specific steps plainly.
