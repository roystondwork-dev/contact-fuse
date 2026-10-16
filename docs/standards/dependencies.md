# Dependencies

Every third-party package we add runs with access to users' contacts and Google tokens. This document defines when a dependency may be added, which licences are acceptable, how versions are pinned, and how updates are handled.

Related: [coding-standards.md](coding-standards.md) · [security-and-privacy.md](../architecture/security-and-privacy.md) · [ci-cd.md](../process/ci-cd.md) · [release-process.md](../process/release-process.md)

## Contents

1. [Before adding a dependency](#1-before-adding-a-dependency)
2. [Licence policy](#2-licence-policy)
3. [Where dependencies go](#3-where-dependencies-go)
4. [Versioning and pinning](#4-versioning-and-pinning)
5. [Known pins](#5-known-pins)
6. [Updates](#6-updates)
7. [Supply-chain safety](#7-supply-chain-safety)
8. [Approved libraries](#8-approved-libraries)

---

## 1. Before adding a dependency

Prefer the platform and existing deps. Add a new runtime dependency only if **all** of these hold — and say so in the PR description:

| Criterion         | Bar                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Need              | Not reasonably implementable in < ~50 lines, or correctness is hard (phone parsing, OAuth, crypto)                    |
| Maintenance       | Release or meaningful commit in the last 12 months; issues answered                                                   |
| Adoption          | Widely used, or published by a trusted org (Google, OpenJS, etc.)                                                     |
| Licence           | On the allowlist (§2)                                                                                                 |
| Size              | Reasonable for its purpose; check bundle impact for `apps/web`                                                        |
| Types             | Ships TypeScript types or has maintained `@types/*`                                                                   |
| Module format     | Works with ESM                                                                                                        |
| Install scripts   | None, or justified (native modules like `better-sqlite3`, `@napi-rs/keyring`) and approved with `pnpm approve-builds` |
| Network/telemetry | Does **not** phone home. Any dependency that sends telemetry is rejected                                              |

`@contact-fuse/core` has the strictest bar: only small, pure, dependency-light libraries (e.g. `zod`, `libphonenumber-js`).

## 2. Licence policy

| Status                       | Licences                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| ✅ Allowed                   | MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, Unlicense, CC0-1.0, BlueOak-1.0.0, Python-2.0 (tooling only) |
| ⚠️ Needs maintainer approval | MPL-2.0 (file-level copyleft), CC-BY-4.0 (non-code assets), anything unusual                                         |
| ❌ Not allowed               | GPL-_, AGPL-_, LGPL-* (for bundled code), SSPL, BUSL, "Commons Clause", unlicensed/unknown                           |

contact-fuse is MIT; dependencies must keep the published `contact-fuse` package redistributable under MIT. CI runs a licence check on the production dependency tree.

## 3. Where dependencies go

- Install into the package that uses it: `pnpm --filter @contact-fuse/server add fastify`.
- Shared dev tooling (TypeScript, ESLint, Prettier, Vitest) lives in the **root** `package.json` (`pnpm add -Dw …`).
- `dependencies` vs `devDependencies`: anything needed at runtime by the published CLI goes in `dependencies`; build/test tools in `devDependencies`.
- Never add the same dependency at different major versions across packages.

## 4. Versioning and pinning

- `pnpm-lock.yaml` is committed and is the source of truth; CI installs with `--frozen-lockfile`.
- Ranges in `package.json`: caret (`^1.2.3`) for libraries is acceptable because the lockfile pins exact versions.
- Exact pins (`1.2.3`) are used when a package is known to break on minor updates or when we pin deliberately (§5). Every deliberate pin is documented in §5 with a reason and an exit condition.
- The pnpm version is pinned via `packageManager` in the root `package.json` (activated by corepack).
- Node: `engines.node >= 22`; development and CI use Node 24 (`.nvmrc`).

## 5. Known pins

| Package      | Pinned to      | Reason                                                                                                                              | Remove when                                        |
| ------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `typescript` | latest `6.0.x` | `typescript-eslint` 8 supports TypeScript `< 6.1`; TypeScript 7 installs produce unmet-peer warnings and unsupported lint behaviour | `typescript-eslint` releases official TS 7 support |

## 6. Updates

| Type                | Cadence                      | Process                                                                         |
| ------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| Security advisories | immediately                  | fix within 7 days for high/critical; patch release if a runtime dep is affected |
| Patch & minor       | weekly (Dependabot, grouped) | merge when CI is green; skim changelog                                          |
| Major               | as needed                    | one major per PR, read migration guide, note breaking changes in the PR         |
| Node / pnpm         | when a new LTS / major lands | separate PR; update `.nvmrc`, `engines`, CI matrix                              |

Dependabot groups dev-tooling updates into one weekly PR to limit noise.

## 7. Supply-chain safety

- Install scripts are disabled by default by pnpm; only allowlisted packages (the `allowBuilds` list in `pnpm-workspace.yaml`, edited via `pnpm approve-builds <pkg>`) may run them. Adding to the allowlist requires review.
- `pnpm audit --prod` runs in CI; high/critical findings fail the build.
- Prefer packages with npm provenance attestations.
- Review the diff of lockfile changes in PRs for unexpected new transitive packages.
- The published `contact-fuse` package is released from CI with npm provenance (see [release-process.md](../process/release-process.md)).

## 8. Approved libraries

These are already decided, so using them needs no extra justification. Anything else goes through §1.

| Package                          | Library                                                                                                                                                                                                                                                                                                            | Purpose                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `packages/core`                  | `zod`, `libphonenumber-js`                                                                                                                                                                                                                                                                                         | Validation, phone normalisation to E.164                                               |
| `packages/provider-google`       | `@googleapis/people`, `google-auth-library`, `zod`                                                                                                                                                                                                                                                                 | Google People API client, OAuth client type, response validation                       |
| `packages/provider-google` (dev) | `msw`                                                                                                                                                                                                                                                                                                              | HTTP mocking                                                                           |
| `apps/server`                    | `fastify`, `@fastify/cookie`, `pino`, `zod`, `drizzle-orm`, `better-sqlite3`, `@napi-rs/keyring`, `env-paths`, `uuid` (v7 IDs)                                                                                                                                                                                     | HTTP server, CSRF cookie, logging, validation, database, keychain, app-data dir        |
| `apps/server` (dev)              | `tsx`, `tsdown`, `drizzle-kit`, `msw`                                                                                                                                                                                                                                                                              | Dev runner, bundler, migrations, HTTP mocking                                          |
| `apps/web`                       | `react`, `react-dom`, `react-router` (v7, declarative mode), `@tanstack/react-query`, `@tanstack/react-table`, `@tanstack/react-virtual`, `react-hook-form`, `sonner`, `lucide-react`, shadcn/ui (copied into the repo) with its helpers `@radix-ui/react-*`, `class-variance-authority`, `clsx`, `tailwind-merge` | UI, routing, server state, tables, virtualised lists, forms, toasts, icons, components |
| `apps/web` (dev)                 | `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `@playwright/test`, `@axe-core/playwright`, `vitest-axe` or `axe-core`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `@testing-library/dom`, `jsdom`, `msw`                                           | Build, styling, component tests (jsdom + MSW), e2e and accessibility testing           |
| root (dev)                       | `typescript`, `eslint`, `typescript-eslint`, `prettier`, `vitest`, `@vitest/coverage-v8`, `@changesets/cli`                                                                                                                                                                                                        | Shared tooling                                                                         |
