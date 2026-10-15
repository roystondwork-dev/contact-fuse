# contact-fuse

<!-- npm badge: switch to a live badge once the package is published (M4) -->

[![CI](https://github.com/roystondwork-dev/contact-fuse/actions/workflows/ci.yml/badge.svg)](https://github.com/roystondwork-dev/contact-fuse/actions/workflows/ci.yml)
[![npm](https://img.shields.io/badge/npm-not%20published-lightgrey)](#quick-start)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: pre-alpha](https://img.shields.io/badge/status-pre--alpha-orange)](docs/product/roadmap.md)

**Merge and de-duplicate contacts from multiple Google accounts into one, locally and safely.**

If you have several Gmail accounts on your phone, you probably have the same people saved two,
three or four times, with slightly different names and numbers. Google's built-in "Merge & fix"
only works inside a single account. contact-fuse looks across **all** your accounts, finds the
duplicates, and merges them into one **main account**. It never acts without your approval.

> ⚠️ **Status: pre-alpha.** contact-fuse is in early development (milestone M0: foundation).
> It is not ready for use with real contacts yet. See the [roadmap](docs/product/roadmap.md).

## Features

- 🔗 **Connect multiple Google accounts** with Google's official sign-in. Your password is never seen.
- 💾 **Automatic backup (snapshot)** before anything changes, exportable as vCard 4.0 or CSV.
- 🔍 **Finds duplicates across accounts:** phone numbers normalised to international format,
  case-insensitive emails, fuzzy name matching.
- 🎯 **Confidence levels:** High matches are preselected, Medium ones need your decision, and Low
  ones stay hidden unless you ask to see them.
- ✅ **You review everything:** approve, reject or edit each suggested merge.
- 👀 **Dry run:** see the exact changes before anything is written.
- ⚙️ **Customisable merge rules** for each field (`prefer-main`, `newest`, `most-complete`, `union`),
  exclusions, and what happens to the source accounts afterwards (`keep`, `label` or `delete`).
- ↩️ **Undo:** every run is recorded in an audit log and can be reversed.

## Safety and privacy promise

contact-fuse handles personal data, so these rules are built into the design. They are not
optional extras:

1. **Your data stays on your computer.** There is no hosted server, no account and no telemetry. The app
   listens only on `127.0.0.1`.
2. **Backup first.** A full snapshot is taken before any write.
3. **Nothing changes without your approval.** You approve the merges and see a dry run first.
4. **Source accounts are left untouched by default.** Deleting from them is opt-in.
5. **Everything can be undone.** Each run is logged and reversible.
6. **Login tokens live in your OS keychain**, never in plain files or logs.

Read more: [Security and privacy](docs/architecture/security-and-privacy.md) · [SECURITY.md](SECURITY.md)

## Quick start

> 🚧 **Coming in v1.** It will look like this:

```sh
npx contact-fuse
```

This starts contact-fuse on your machine and opens it in your browser. Before your first run, you'll
create your own free Google Cloud OAuth client (about 5 minutes). See the
[Google Cloud setup guide](docs/guides/google-cloud-setup.md).

## Screenshots

_Screenshots will be added once the UI exists (milestone M2)._

## Documentation

| Area            | Start here                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Overview        | [Docs index](docs/README.md)                                                                                                            |
| Product         | [Vision](docs/product/vision.md) · [Roadmap](docs/product/roadmap.md) · [Glossary](docs/product/glossary.md)                            |
| Architecture    | [Overview](docs/architecture/overview.md) · [Project structure](docs/architecture/project-structure.md) · [ADRs](docs/adr/README.md)    |
| Standards       | [Coding](docs/standards/coding-standards.md) · [Naming](docs/standards/naming-conventions.md) · [Testing](docs/standards/testing.md)    |
| Design          | [Design system](docs/design/design-system.md) · [Accessibility](docs/design/accessibility.md)                                           |
| Process         | [Git workflow](docs/process/git-workflow.md) · [Code review](docs/process/code-review.md) · [Releases](docs/process/release-process.md) |
| Developer setup | [Development setup](docs/guides/development-setup.md)                                                                                   |

## Tech stack

TypeScript monorepo (pnpm) · Fastify · React + Vite + Tailwind CSS · SQLite + Drizzle · Google
People API · Vitest + Playwright. See the [architecture overview](docs/architecture/overview.md).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our
[Code of Conduct](CODE_OF_CONDUCT.md). Issues labelled
[`good first issue`](docs/process/issue-triage.md) are a good place to start.

## License

[MIT](LICENSE) © 2026 Royston D and contact-fuse contributors.

contact-fuse is not affiliated with or endorsed by Google. "Gmail" and "Google" are trademarks of
Google LLC.
