# Definition of done

A change is **done** only when everything below that applies is true. Reviewers use this list
together with the [code review checklist](code-review.md).

## Every change

- [ ] Merged to `main` through a squash-merged PR with a Conventional Commit title
- [ ] CI is green: format, lint, typecheck, test, build ([CI/CD](ci-cd.md))
- [ ] Reviewed and approved by at least one maintainer
- [ ] No PII or tokens anywhere (code, logs, fixtures, screenshots, commits)
- [ ] Linked issue closed or updated

## Code changes

- [ ] Follows the [coding standards](../standards/coding-standards.md) and [naming conventions](../standards/naming-conventions.md)
- [ ] Tests cover the new behaviour, following [testing](../standards/testing.md), and coverage targets are held (core ≥ 90%, server and providers ≥ 75% lines)
- [ ] Bug fixes include a regression test that failed before the fix
- [ ] Errors are handled with `ContactFuseError` codes, logs are structured and PII-free ([error handling](../standards/error-handling-and-logging.md))
- [ ] No new `any`, `@ts-ignore` or disabled lint rules without a justification comment

## Features that write to a provider

- [ ] A snapshot is taken first
- [ ] The operation is part of an approved merge plan and appears in the dry run
- [ ] Every operation is recorded in the audit log and can be undone
- [ ] Etag conflicts are skipped and reported
- [ ] Rate limits are respected with retry and backoff
- [ ] Integration tests cover success, conflict, rate-limit and partial-failure paths (MSW)

## UI changes

- [ ] Uses design tokens, with no raw colours ([design system](../design/design-system.md))
- [ ] Loading, empty and error states are handled ([UI guidelines](../design/ui-guidelines.md))
- [ ] Keyboard and screen-reader accessible, WCAG 2.2 AA ([accessibility](../design/accessibility.md))
- [ ] Verified in light and dark mode
- [ ] Copy follows the [content style guide](../design/content-style-guide.md)

## Documentation

- [ ] User-facing docs and README updated where behaviour changed
- [ ] Architecture docs updated, and a new [ADR](../adr/README.md) added for significant decisions
- [ ] Changeset added for user-facing changes ([release process](release-process.md))
