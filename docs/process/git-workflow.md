# Git workflow

contact-fuse uses **trunk-based development**: `main` is always releasable, branches are short-lived,
and every change lands through a pull request.

## Branches

| Branch                      | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `main`                      | The trunk. Protected. Always green, always releasable. |
| `<type>/<short-kebab-desc>` | Your working branch. Lives for days, not weeks.        |
| `changeset-release/main`    | Created automatically by the Changesets release PR.    |

Branch name types match commit types:

| Type        | Use for                              | Example                         |
| ----------- | ------------------------------------ | ------------------------------- |
| `feat/`     | New user-facing capability           | `feat/vcard-export`             |
| `fix/`      | Bug fix                              | `fix/phone-leading-zero`        |
| `docs/`     | Documentation only                   | `docs/google-cloud-screenshots` |
| `refactor/` | Code change with no behaviour change | `refactor/split-matcher`        |
| `test/`     | Adding or fixing tests only          | `test/merge-rules-union`        |
| `chore/`    | Tooling, deps, CI, housekeeping      | `chore/bump-vitest`             |

Rules: lowercase, kebab-case, at most about 5 words, with an issue number optional (`fix/123-etag-conflict`).

## Commits: Conventional Commits

Format:

```
<type>(<optional scope>): <imperative summary, ≤ 72 chars, no period>

<optional body: what and why, wrapped at 100>

<optional footer: Closes #123, BREAKING CHANGE: ...>
```

- **Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`, `revert`
- **Scopes** (match the package or area): `core`, `server`, `web`, `provider-google`, `db`, `deps`, `docs`, `ci`
- **Breaking changes:** `feat(core)!: rename Cluster.members to Cluster.contacts` plus a `BREAKING CHANGE:` footer

Examples:

```
feat(core): normalise phone numbers to E.164
fix(provider-google): retry batchUpdateContacts on 429 with backoff
docs(adr): add ADR 0009 for CardDAV provider
```

Never put PII in commit messages, including real names, numbers or emails used in debugging.

## Pull requests

1. Keep PRs **small and focused**. Aim for under about 400 changed lines, excluding lockfile and snapshots.
2. **Use a Conventional Commit for the PR title.** It becomes the squash-commit message.
3. Fill in the [PR template](../../.github/PULL_REQUEST_TEMPLATE.md).
4. Link the issue (`Closes #123`).
5. Add a changeset for user-facing changes ([release process](release-process.md)).
6. Use a **draft PR** for early feedback.

## Merging

- **Squash merge only.** Merge commits and rebase merges are disabled.
- Requirements: all [required CI checks](ci-cd.md) green, **≥ 1 approving review**, conversations resolved,
  and the branch up to date with `main`.
- The branch is deleted automatically after merge.

## `main` branch protection (repository settings)

- Require pull request and 1 approval. Dismiss stale approvals on new commits.
- Require status checks: `ci / check` (see [CI/CD](ci-cd.md)).
- Require linear history. Block force pushes and deletion.
- Signed commits are encouraged but not required.

## Keeping your branch current

```sh
git fetch origin
git rebase origin/main      # preferred for your own branch
git push --force-with-lease # only on your own branch, never on main
```

## Hotfixes

There are no long-lived release branches before 1.0. A hotfix is a normal `fix/` PR, released by the
next Changesets release. See [release process](release-process.md).
