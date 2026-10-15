# 0004. Fastify for the server, React + Vite for the UI

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** maintainers

## Context

The server is a local API with a handful of resources, long-running jobs and strict input validation.
The UI is a single-page app with tables, diffs and multi-step flows; it must be served statically by
the same local process and work fully offline.

## Decision

- **Server:** Fastify, with its built-in pino logger, `inject()` for tests, plugins for security
  headers, CSRF and static file serving, and Zod for request/response schemas. Dev runs with `tsx`,
  builds with `tsdown`.
- **UI:** React + Vite single-page app, Tailwind CSS v4 with design tokens, shadcn/ui (Radix)
  components, lucide-react icons, TanStack Query for server state.
- In development Vite runs on `:5173` and proxies `/api` to the server on `:4317`; in production the
  server serves the built UI.

## Consequences

- Positive: mainstream, well-documented choices with large contributor familiarity.
- Positive: Fastify `inject()` gives fast HTTP tests without opening ports.
- Positive: shadcn/ui components are copied into the repo, so we control accessibility and styling.
- Negative: two dev processes; `pnpm dev` runs both.
- Negative: a client-side SPA, so no SSR — irrelevant for a local app.

## Alternatives considered

| Option               | Why not                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| Next.js / Remix      | Server rendering and routing conventions add weight we do not need locally      |
| Express              | Older API, slower, no built-in schema/logging story                             |
| Hono                 | Good, but smaller plugin ecosystem for static serving, CSRF and cookies on Node |
| Vue / Svelte         | Fine frameworks; React has the largest contributor pool and shadcn/ui           |
| Material UI / Chakra | Heavier runtime styling; less control over tokens                               |
