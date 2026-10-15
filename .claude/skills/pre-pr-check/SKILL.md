---
name: pre-pr-check
description: Use before opening or updating a pull request in contact-fuse — runs all local checks and walks the privacy, safety and definition-of-done checklist.
---

# Pre-PR check

## 1. Automated checks (all must pass)

```sh
pnpm install --frozen-lockfile
pnpm check     # format:check + lint + typecheck + test
pnpm build
```

If formatting fails, run `pnpm format`, then re-run.

## 2. Privacy scan (blocking)

Search the diff for accidental personal data and secrets:

```sh
git diff origin/main...HEAD | grep -nEi '@gmail\.com|@googlemail|\+?[0-9][0-9 ()-]{8,}|ya29\.|refresh_token|client_secret|console\.log'
```

Check every hit: fixtures must use `example.com` addresses and fictional numbers, and there must be no
tokens and no stray `console.log`. Logs must contain IDs and counts only.

## 3. Safety review (if the change touches provider writes, merge or delete)

- Snapshot happens before any write
- Writes only come from an approved merge plan, and every operation goes to the audit log
- Etag conflicts are skipped and reported. Undo works for the new operation type
- The default cleanup policy is still `keep`

## 4. Housekeeping

- Branch name is `<type>/<short-kebab-desc>`, and the PR title is a Conventional Commit
- Run `pnpm changeset` if the change is user-facing
- Docs are updated. Add an ADR if architecture changed (skill: `new-adr`)
- UI: screenshots in light and dark mode, synthetic data only

## 5. Final gate

Walk through [docs/process/definition-of-done.md](../../../docs/process/definition-of-done.md) and fill in
the [PR template](../../../.github/PULL_REQUEST_TEMPLATE.md). Report any item that can't be met and
explain why. Don't silently skip it.
