# Issue triage

The goal of triage is that every new issue gets a response, a type, an area and a priority, so
contributors can find work and users know what to expect.

## Triage SLA

| Step                                        | Target                                |
| ------------------------------------------- | ------------------------------------- |
| First response on new issue                 | within 3 days                         |
| Labelled (`type:*`, `area:*`, `priority:*`) | within 7 days                         |
| `status:needs-info` with no reply           | closed after 14 days (reopen anytime) |
| `priority:critical` (data loss/security)    | acknowledged within 24 h              |

Security reports never go through public issues. See [SECURITY.md](../../SECURITY.md).

## Triage steps

1. **Is it a duplicate?** If so, link the original, label `status:duplicate` and close it.
2. **Does it contain PII or tokens?** Edit them out immediately and remind the reporter.
3. **Is it reproducible or clear?** If not, label `status:needs-info` and ask for specifics.
4. Add **one `type:*`**, **one or more `area:*`** and **one `priority:*`**.
5. Mark it `good first issue` or `help wanted` if suitable.
6. Remove `status:needs-triage`.

## Label taxonomy

New issues get `status:needs-triage` automatically from the issue forms.

### Type: what kind of issue it is

| Label           | Colour    | Meaning                                        |
| --------------- | --------- | ---------------------------------------------- |
| `type:bug`      | `#D73A4A` | Something doesn't work as documented           |
| `type:feature`  | `#6366F1` | New capability or enhancement                  |
| `type:docs`     | `#0075CA` | Documentation                                  |
| `type:chore`    | `#C5DEF5` | Tooling, deps, CI, refactors                   |
| `type:question` | `#D876E3` | Support question (prefer Discussions)          |
| `type:security` | `#B60205` | Security hardening (not vulnerability reports) |

### Area: which part of the system

| Label                  | Colour    | Meaning                                        |
| ---------------------- | --------- | ---------------------------------------------- |
| `area:core`            | `#BFD4F2` | Matching engine, normalisation, merge planning |
| `area:server`          | `#BFD4F2` | Fastify API, jobs, OAuth flow                  |
| `area:web`             | `#BFD4F2` | React UI                                       |
| `area:provider-google` | `#BFD4F2` | Google People API integration                  |
| `area:db`              | `#BFD4F2` | SQLite schema, migrations, snapshots           |
| `area:cli`             | `#BFD4F2` | `npx contact-fuse` launcher                    |
| `area:docs`            | `#BFD4F2` | docs/ and README                               |
| `area:ci`              | `#BFD4F2` | GitHub Actions, release automation             |

### Priority: how urgent it is

| Label               | Colour    | Meaning                                                      |
| ------------------- | --------- | ------------------------------------------------------------ |
| `priority:critical` | `#B60205` | Data loss, wrong merge or delete, security. Drop everything. |
| `priority:high`     | `#D93F0B` | Major feature broken, no workaround                          |
| `priority:medium`   | `#FBCA04` | Important, has a workaround                                  |
| `priority:low`      | `#0E8A16` | Nice to have                                                 |

### Status: where it is in the workflow

| Label                 | Colour    | Meaning                                    |
| --------------------- | --------- | ------------------------------------------ |
| `status:needs-triage` | `#EDEDED` | Not yet reviewed by a maintainer           |
| `status:needs-info`   | `#FEF2C0` | Waiting on the reporter                    |
| `status:confirmed`    | `#C2E0C6` | Reproduced or accepted                     |
| `status:in-progress`  | `#1D76DB` | Someone is working on it                   |
| `status:blocked`      | `#E99695` | Waiting on another issue or external party |
| `status:duplicate`    | `#CFD3D7` | Duplicate of another issue                 |
| `status:wontfix`      | `#FFFFFF` | Out of scope or declined (explain why)     |

### Contributor

| Label              | Colour    | Meaning                                  |
| ------------------ | --------- | ---------------------------------------- |
| `good first issue` | `#7057FF` | Small, well-defined, mentoring available |
| `help wanted`      | `#008672` | Maintainers would welcome a contribution |

## Data-loss reports

Any report of a wrong merge, lost or overwritten contact, or failed undo is **`priority:critical`** by
default, until triage shows otherwise. Ask the reporter for the run ID and audit-log export (with PII
redacted), never the contacts themselves.
