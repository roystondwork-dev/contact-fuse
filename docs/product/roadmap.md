# Roadmap

Milestones are delivered in order. Each one ends with exit criteria that must be met before the next starts. Dates are intentionally omitted: this is a volunteer-driven open-source project.

Last updated: 2026-10-11. Current milestone: **M0**.

| #     | Milestone         | Theme                                        | Writes to Google? |
| ----- | ----------------- | -------------------------------------------- | ----------------- |
| M0    | Foundation        | Repo, tooling, docs, CI                      | No                |
| M1    | Connect & back up | Sign in, fetch, snapshot, export             | No                |
| M2    | Find duplicates   | Matching engine + read-only report           | No                |
| M3    | Merge             | Review, rules, dry run, apply, cleanup, undo | **Yes**           |
| M4    | v1.0 release      | Packaging, docs, hardening                   | Yes               |
| Later | Extras            | More providers, photos, scheduled sync       | Yes               |

---

## M0: Foundation

Goal: a contributor can clone the repo, install, and run checks in minutes.

- [x] pnpm workspace monorepo: `apps/server`, `apps/web`, `packages/core`, `packages/provider-google`
- [x] TypeScript strict config, ESLint, Prettier, EditorConfig
- [x] Vitest wired for all packages, one passing test per package (`apps/web` gets its first tests with Playwright in M2)
- [x] Fastify server with `/api/health` on `127.0.0.1:4317`
- [x] React + Vite + Tailwind v4 web app that calls the health endpoint
- [x] GitHub Actions CI (format, lint, typecheck, test, build), green on Node 22 and 24
- [x] Community files: README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, LICENSE (MIT), CHANGELOG
- [x] Documentation set under `docs/` (product, architecture, ADRs, standards, design, guides, process)
- [x] `CLAUDE.md` and project skills under `.claude/skills/`

**Exit criteria:** `pnpm install && pnpm check && pnpm build` passes on a clean macOS and Linux machine and in CI.

## M1: Connect & back up

Goal: read-only access to any number of Google accounts, with a downloadable backup.

- [ ] Google OAuth 2.0 installed-app loopback flow with PKCE ([ADR 0006](../adr/0006-user-owned-google-oauth-client.md))
- [ ] Settings screen to enter the user's own OAuth client ID and secret
- [ ] Connect, list and disconnect multiple accounts; tokens stored in the OS keychain
- [ ] Fetch all contacts via the People API (paginated, rate-limit aware) and map them to the canonical `Contact`
- [ ] Optional: include "Other contacts" (`contacts.other.readonly`)
- [ ] SQLite database (Drizzle) in the OS app-data directory, with committed migrations
- [ ] Snapshot creation, listing and export as vCard 4.0 and CSV
- [ ] "Delete all local data" action
- [ ] [Google Cloud setup guide](../guides/google-cloud-setup.md) with screenshots

**Exit criteria:** a tester connects 3 accounts with 5,000+ contacts in total, takes a snapshot and re-imports the exported vCard into a test account with zero data loss. Integration tests use MSW mocks only.

## M2: Find duplicates

Goal: a trustworthy, explainable duplicate report. Still 100% read-only.

- [ ] Normalisation: names, emails, phones to E.164 (`libphonenumber-js`, default region setting)
- [ ] Blocking (candidate generation) by phone, email and name keys
- [ ] Pairwise scoring 0–100 with reasons; fuzzy name similarity
- [ ] Clustering (connected components with guard rails)
- [ ] Confidence levels High / Medium / Low with configurable thresholds
- [ ] Exclusions (contacts and labels)
- [ ] Scan results UI: summary, cluster list, filters, cluster detail with reasons
- [ ] Synthetic benchmark dataset plus precision/recall report in CI

**Exit criteria:** benchmark precision ≥ 98% at High, recall ≥ 90% at High + Medium. A scan of 10,000 contacts finishes in under 10 s on a 2020-era laptop.

## M3: Merge

Goal: safely write merged contacts to the main account, with undo.

- [ ] Main account selection
- [ ] Merge rules per field: `prefer-main`, `newest`, `most-complete`, `union`
- [ ] Review UI: approve, reject or edit each cluster; bulk-approve High
- [ ] Merge plan generation and **dry run** diff view
- [ ] Automatic snapshot before every run (cannot be skipped)
- [ ] Run execution: batch create/update/delete, etag conflict detection, retry with backoff
- [ ] Cleanup policy for source accounts: `keep` (default), `label`, `delete` (type-to-confirm)
- [ ] Audit log of every operation
- [ ] Undo a run (restore from the audit log and snapshot)

**Exit criteria:** end-to-end tests cover apply → undo returning to an identical state. Interrupting a run (kill the process) leaves a resumable or undoable state. A manual test on real test accounts is signed off by two maintainers.

## M4: v1.0 release

Goal: anyone can install and use it.

- [ ] Single published npm package `contact-fuse` (CLI bundling server + web), `npx contact-fuse` opens the browser
- [ ] First-run onboarding wizard
- [ ] Accessibility audit (WCAG 2.2 AA) passed, see [accessibility](../design/accessibility.md)
- [ ] Dark mode
- [ ] Docs site or polished README with screenshots and a demo GIF
- [ ] Security review of OAuth, token storage and the local server ([security and privacy](../architecture/security-and-privacy.md))
- [ ] Changesets release pipeline, signed npm provenance
- [ ] Moderated usability test with 5 non-developers

**Exit criteria:** all [v1.0 success metrics](vision.md#success-metrics) met, zero open `data-loss` or `security` issues.

## Later (unordered, not committed)

- [ ] CardDAV provider (iCloud, Fastmail, Nextcloud)
- [ ] Microsoft provider (Outlook/Microsoft 365 via Microsoft Graph)
- [ ] Contact photos (pick best, merge)
- [ ] Scheduled re-scan and incremental sync (People API sync tokens)
- [ ] Merge _within_ the main account only (single-account mode)
- [ ] Docker image
- [ ] Internationalisation of the UI
- [ ] Desktop wrapper (Tauri) if user testing shows `npx` is a barrier
- [ ] Import from vCard/CSV files as a "provider"

Propose additions through a GitHub feature request. Larger changes need an [ADR](../adr/README.md).
