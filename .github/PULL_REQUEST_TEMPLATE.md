<!--
PR title must be a Conventional Commit, e.g. `feat(core): normalise phone numbers to E.164`.
⚠️ Never include real contact data, emails, phone numbers or tokens in this PR, including screenshots.
-->

## What and why

<!-- What does this change do, and why is it needed? -->

Closes #

## How it was tested

<!-- Tests added/updated, manual steps. Use synthetic data only. -->

## Screenshots (UI changes)

<!-- Light and dark mode. Synthetic data only. Delete this section if not applicable. -->

## Checklist

- [ ] `pnpm check` and `pnpm build` pass locally
- [ ] Tests added or updated (bug fixes include a regression test)
- [ ] No PII or tokens in code, logs, fixtures, screenshots or this description
- [ ] Safety model respected for provider writes (snapshot → approved plan → dry run → audit log → undo)
- [ ] Changeset added (`pnpm changeset`) if user-facing
- [ ] Docs or ADR updated if behaviour or architecture changed

See the [definition of done](../docs/process/definition-of-done.md).
