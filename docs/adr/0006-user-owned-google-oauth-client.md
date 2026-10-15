# 0006. Users bring their own Google OAuth client

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** maintainers

## Context

The People API `contacts` scope is a **sensitive** scope. A shared OAuth client published by the project
would need Google's OAuth verification (brand verification, privacy policy, demo video) and the
maintainers would own a credential every user depends on. Shipping a client secret in an open-source
repo also lets anyone impersonate the app. Unverified apps are limited to 100 users and show warning
screens.

## Decision

Each user creates their **own Google Cloud project and _Desktop app_ OAuth client** and pastes the client
ID and secret into contact-fuse on first run. The app uses the installed-app loopback flow with PKCE
(RFC 8252). The project publishes a step-by-step [Google Cloud setup guide](../guides/google-cloud-setup.md).
The app stays in **Testing** publishing status with the user's own accounts added as test users.

## Consequences

- Positive: no central credential, no verification process, no quota shared across all users.
- Positive: consistent with the local-first promise ([0003](0003-local-first-loopback-web-app.md)).
- Negative: ~5–10 minutes of setup friction; the guide and in-app wizard must be excellent.
- Negative: in Testing mode **refresh tokens expire after 7 days** — users reconnect weekly. The UI must
  make reconnecting one click and runs must pause, not fail.
- Negative: up to 100 test users per client — irrelevant for personal use.
- Follow-ups: revisit a verified shared client if the project gains a maintainer organisation able to
  carry verification.

## Alternatives considered

| Option                                   | Why not                                                            |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Project-owned verified client            | Verification burden; single credential for all users; shared quota |
| Project-owned client in repo, unverified | Leaks the secret; 100-user cap across _all_ users                  |
| Google Contacts CSV export/import only   | No incremental work, no etag safety, no undo via API               |
| CardDAV for Google                       | Google's CardDAV also requires OAuth; less complete data model     |
