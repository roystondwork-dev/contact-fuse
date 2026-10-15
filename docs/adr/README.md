# Architecture Decision Records

An ADR records **one significant decision**: the context, what we chose, what it costs and what we
rejected. ADRs explain _why_ the code looks the way it does, so future contributors do not re-argue
settled questions — or know exactly what changed if they do.

## Index

| #                                                        | Title                                            | Status   | Date       |
| -------------------------------------------------------- | ------------------------------------------------ | -------- | ---------- |
| [0001](0001-record-architecture-decisions.md)            | Record architecture decisions                    | Accepted | 2026-10-11 |
| [0002](0002-typescript-pnpm-monorepo.md)                 | TypeScript in a pnpm workspaces monorepo         | Accepted | 2026-10-11 |
| [0003](0003-local-first-loopback-web-app.md)             | Local-first web app served on loopback           | Accepted | 2026-10-11 |
| [0004](0004-fastify-and-react-vite.md)                   | Fastify for the server, React + Vite for the UI  | Accepted | 2026-10-11 |
| [0005](0005-sqlite-with-drizzle.md)                      | SQLite with Drizzle ORM for local persistence    | Accepted | 2026-10-11 |
| [0006](0006-user-owned-google-oauth-client.md)           | Users bring their own Google OAuth client        | Accepted | 2026-10-11 |
| [0007](0007-provider-abstraction-and-canonical-model.md) | Provider abstraction and canonical contact model | Accepted | 2026-10-11 |
| [0008](0008-safety-first-merge-model.md)                 | Safety-first merge model                         | Accepted | 2026-10-11 |

## When to write an ADR

Write one when a change:

- adds or replaces a framework, database, major library or build tool;
- changes a package boundary or [dependency rule](../architecture/project-structure.md#dependency-rules);
- requests a new OAuth scope or new network destination;
- changes the safety model (snapshot, dry run, confirmation, audit, undo);
- is hard to reverse, or reviewers disagree about it.

Bug fixes, refactors inside one module and dependency bumps do not need ADRs.

## How to add one

1. Copy [template.md](template.md) to `NNNN-kebab-case-title.md` using the next free number.
2. Fill it in with status `Proposed` and open a PR (`docs/adr-NNNN-short-title` branch,
   commit `docs(adr): propose NNNN <title>`).
3. On merge, set status to `Accepted` and add a row to the index above.
4. **Never rewrite an accepted ADR.** To change a decision, write a new ADR and set the old one to
   `Superseded by [NNNN](NNNN-....md)`.

Statuses: `Proposed` → `Accepted` | `Rejected`; later `Deprecated` or `Superseded by NNNN`.

The `new-adr` skill (`.claude/skills/new-adr/SKILL.md`) automates steps 1–3 for AI agents.
