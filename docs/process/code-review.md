# Code review

Every change to `main` is reviewed by at least one maintainer. Reviews protect users' contact data, so
**safety and privacy issues always block a merge**.

## Principles

- Review the **change, not the person**. Be kind, specific and explain why.
- Prefix non-blocking comments with **`nit:`** and optional ideas with **`suggestion:`**. Anything else is
  treated as blocking.
- Aim to give a first response **within 2 working days**.
- Approve when the PR makes the codebase better, even if it isn't perfect. Follow-ups are fine for
  non-blocking work if you file an issue.

## Author checklist (before requesting review)

- [ ] PR title is a Conventional Commit, and the description explains **what** and **why**
- [ ] The change is small and focused, with no unrelated refactors
- [ ] `pnpm check` and `pnpm build` pass locally
- [ ] Tests added or updated, and bug fixes include a regression test
- [ ] No PII or tokens in code, logs, fixtures, screenshots, commit messages or the PR description
- [ ] Changeset added if the change is user-facing
- [ ] Docs updated (README, docs/, ADR if it's an architectural decision)
- [ ] UI changes include screenshots (light **and** dark) using synthetic data only
- [ ] Self-reviewed the diff on GitHub

## Reviewer checklist

### Safety and privacy (blocking)

- [ ] No PII or tokens logged, persisted in plain text or sent anywhere except the user's own provider
- [ ] Provider writes go through snapshot → approved merge plan → audit log, with no bypass
- [ ] Destructive operations are opt-in, confirmed and undoable. The default cleanup policy stays `keep`
- [ ] Etag/version conflicts are detected and skipped, not overwritten
- [ ] Server stays bound to `127.0.0.1`. New endpoints have CSRF/origin protection
- [ ] No new telemetry, remote fonts, CDNs or third-party calls

### Correctness and design

- [ ] Logic is correct, including edge cases (empty lists, missing fields, Unicode names, international numbers)
- [ ] `packages/core` stays pure (no I/O, no provider imports)
- [ ] External input is validated with Zod, and errors use `ContactFuseError` with a code
- [ ] Fits the existing architecture, or there is an ADR for the new direction

### Quality

- [ ] Follows the [coding standards](../standards/coding-standards.md) and [naming conventions](../standards/naming-conventions.md)
- [ ] Tests are meaningful (behaviour, not implementation) and deterministic, following [testing](../standards/testing.md)
- [ ] API changes follow [API design](../standards/api-design.md). DB changes include a migration ([database](../standards/database.md))
- [ ] New dependencies are justified ([dependencies](../standards/dependencies.md))
- [ ] UI uses design tokens, is accessible, and works in light and dark mode ([design system](../design/design-system.md), [accessibility](../design/accessibility.md))
- [ ] User-facing text follows the [content style guide](../design/content-style-guide.md)

## Outcomes

| Outcome             | When                                                        |
| ------------------- | ----------------------------------------------------------- |
| **Approve**         | Ready to merge. Nits may be left for the author's choice.   |
| **Comment**         | Questions only, or a partial review                         |
| **Request changes** | Any blocking issue, and always for safety or privacy issues |

See also: [Definition of done](definition-of-done.md) · [Git workflow](git-workflow.md)
