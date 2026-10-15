# 0002. TypeScript in a pnpm workspaces monorepo

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** maintainers

## Context

The product has a server, a browser UI and reusable logic (matching, merging) that must be testable in
isolation and reusable by future providers. We want one language end to end, a large contributor pool,
and strong typing for code that can delete user data.

## Decision

We will write everything in **TypeScript** (`strict`, plus `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`), ESM only, on **Node.js ≥ 22** (development on 24, see `.nvmrc`).

We will use a **pnpm workspaces monorepo** (pnpm managed by corepack, version pinned in
`packageManager`) with this layout:

- `apps/server`, `apps/web` — deployable apps;
- `packages/core`, `packages/provider-*` — libraries.

Internal packages are private, scoped `@contact-fuse/*`, and export TypeScript source directly; only
the bundled CLI `contact-fuse` is published. TypeScript is pinned to the latest **6.0.x** until
typescript-eslint supports TypeScript 7.

## Consequences

- Positive: shared types between server and UI; one toolchain (ESLint, Prettier, Vitest) for all.
- Positive: pnpm's strict `node_modules` catches undeclared dependencies; fast, disk-efficient installs;
  dependency build scripts are blocked unless explicitly approved.
- Negative: contributors must enable corepack/pnpm (documented in
  [development setup](../guides/development-setup.md)).
- Negative: exporting source means packages cannot be consumed outside the monorepo without a build —
  acceptable because they are not published.

## Alternatives considered

| Option                       | Why not                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| Python backend + JS frontend | Two languages and toolchains; no shared types                             |
| Go / Rust single binary      | Smaller contributor pool for this domain; UI still needs TS               |
| npm or Yarn workspaces       | npm is less strict about phantom deps; Yarn PnP adds friction for tooling |
| Turborepo / Nx               | Not needed at this size; can be added later without restructuring         |
| Separate repositories        | Cross-package changes would need coordinated releases                     |
