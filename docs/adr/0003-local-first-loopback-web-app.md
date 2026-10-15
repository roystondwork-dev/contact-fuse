# 0003. Local-first web app served on loopback

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** maintainers

## Context

Users need a friendly UI to review possibly hundreds of duplicate clusters. The data is highly personal,
and the main competitors require uploading address books to their servers. A hosted service would also
require Google's sensitive-scope OAuth verification, ongoing hosting cost and a
privacy policy that we cannot honestly keep as simple as "we never see your data".

## Decision

contact-fuse runs **entirely on the user's machine**. `npx contact-fuse` starts a Node.js server bound
to **`127.0.0.1` only** and opens the system browser. There is no contact-fuse backend, no accounts, and
no telemetry. Network calls go only to the user's own provider accounts.

## Consequences

- Positive: strongest privacy story; no infrastructure to run or pay for; no central breach target.
- Positive: works with user-owned OAuth clients ([0006](0006-user-owned-google-oauth-client.md)).
- Negative: a local HTTP server is reachable by other software on the machine and by malicious web
  pages via the browser; we must defend with Host/Origin checks, CSRF tokens and strict CSP
  ([security and privacy](../architecture/security-and-privacy.md)).
- Negative: requires Node.js on the user's machine; a packaged desktop build may be added later.
- Negative: no background sync while the app is closed.

## Alternatives considered

| Option                     | Why not                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Hosted SaaS                | Data leaves the device; verification cost; hosting cost; contradicts the product promise    |
| Electron/Tauri desktop app | Heavier to build, sign and release on three OSes; can wrap this design later                |
| CLI only                   | Reviewing clusters in a terminal is too hard for the target users                           |
| Mobile app                 | Much higher effort; Google contacts on Android/iOS are better served from the account level |
