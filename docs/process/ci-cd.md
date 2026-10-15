# CI/CD

CI runs on **GitHub Actions**. The workflow lives in
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

## Triggers

- `pull_request` targeting `main`
- `push` to `main`
- Concurrency: one run per ref, and newer pushes **cancel** in-progress runs on PRs

## Pipeline stages

| #   | Stage               | Command                          | Fails when                               |
| --- | ------------------- | -------------------------------- | ---------------------------------------- |
| 1   | Install             | `pnpm install --frozen-lockfile` | Lockfile out of date with `package.json` |
| 2   | Format              | `pnpm format:check`              | Any file not Prettier-formatted          |
| 3   | Lint                | `pnpm lint`                      | ESLint errors                            |
| 4   | Typecheck           | `pnpm typecheck`                 | Any `tsc` error in any package           |
| 5   | Test                | `pnpm test`                      | Failing test or coverage below threshold |
| 6   | Build               | `pnpm build`                     | Build error in any package               |
| 7   | E2E _(planned, M2)_ | `pnpm test:e2e` (Playwright)     | Failing browser test                     |

Steps 2 to 6 run in sequence in one job, so a failure stops the run early and saves minutes.

## Required checks

Branch protection on `main` requires:

- `ci / check (node 22)`
- `ci / check (node 24)`

The E2E jobs become required once they are stable (target M2).

## Matrix

| Job     | Node   | OS                                                | Status       |
| ------- | ------ | ------------------------------------------------- | ------------ |
| `check` | 22, 24 | `ubuntu-latest`                                   | Active       |
| `e2e`   | 24     | `ubuntu-latest`, `macos-latest`, `windows-latest` | Planned (M2) |

Node 22 is the minimum supported version (`engines.node >= 22`), and 24 is the development version (`.nvmrc`).
E2E runs on all three operating systems because the OS keychain, file paths and browser launch differ by platform.

## Caching

- pnpm store cache via `actions/setup-node` with `cache: pnpm`, keyed on `pnpm-lock.yaml`
- Playwright browsers cached by version (once E2E is live)
- Never cache build outputs between runs. Every run builds from scratch.

## Security of the pipeline

- `permissions: contents: read` by default. Jobs request more only when needed (release: `contents: write`,
  `pull-requests: write`, `id-token: write` for npm provenance)
- Third-party actions are pinned to a major version and kept current by Dependabot
- No secrets are available to workflows triggered from forks
- Tests never use real Google credentials. Google HTTP is mocked with MSW

## Dependency updates

[Dependabot](../../.github/dependabot.yml) opens grouped weekly PRs for npm and GitHub Actions.
See the [dependencies policy](../standards/dependencies.md).

## CD: releases

Publishing is handled by a separate release workflow using Changesets. See the
[release process](release-process.md). It is added in M4. Until then, nothing is published.

## Running CI locally

```sh
pnpm install --frozen-lockfile
pnpm check && pnpm build
```
