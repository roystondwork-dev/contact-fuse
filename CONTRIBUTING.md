# Contributing to contact-fuse

Thanks for helping. This guide walks you through contributing from start to finish. All
participation is covered by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug:** use the [bug report form](.github/ISSUE_TEMPLATE/bug_report.yml). Never paste real contacts or tokens.
- **Suggest a feature:** use the [feature request form](.github/ISSUE_TEMPLATE/feature_request.yml).
- **Improve the docs:** typo fixes are welcome without an issue.
- **Write code:** pick an issue labelled `good first issue` or `help wanted`
  (see [issue triage](docs/process/issue-triage.md)).
- **Report a security problem:** **do not open a public issue.** Follow [SECURITY.md](SECURITY.md).

## Before you start coding

1. **Find or open an issue** for anything bigger than a small fix, and say you'd like to work on it.
   A maintainer will confirm the approach so your work isn't wasted.
2. Significant design changes need an **ADR**. See [docs/adr/README.md](docs/adr/README.md).
3. Read the project's ground rules:
   - [Coding standards](docs/standards/coding-standards.md)
   - [Naming conventions](docs/standards/naming-conventions.md)
   - [Testing](docs/standards/testing.md)
   - [Error handling and logging](docs/standards/error-handling-and-logging.md). **Never log PII.**
   - [Design system](docs/design/design-system.md) and [UI guidelines](docs/design/ui-guidelines.md) for UI work

## Workflow

1. **Set up your machine:** follow [development setup](docs/guides/development-setup.md).
   ```sh
   corepack enable pnpm
   pnpm install
   pnpm dev
   ```
2. **Create a branch** from `main`: `<type>/<short-kebab-desc>`, for example `feat/phone-normalisation`
   ([git workflow](docs/process/git-workflow.md)).
3. **Make small, focused commits** using [Conventional Commits](https://www.conventionalcommits.org/):
   `feat(core): normalise phone numbers to E.164`.
4. **Add tests.** Every behaviour change needs them. Use synthetic fixture data only, **never real contacts**.
5. **Add a changeset** if your change affects users: `pnpm changeset`
   ([release process](docs/process/release-process.md)).
6. **Run all checks locally:**
   ```sh
   pnpm check   # format, lint, typecheck, test
   pnpm build
   ```
7. **Open a pull request** and fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md).
   CI must pass, and at least one maintainer must approve. We squash-merge.

What "done" means: [Definition of done](docs/process/definition-of-done.md).
What reviewers check: [Code review](docs/process/code-review.md).

## Golden rules

- 🔒 **Privacy:** no telemetry, no remote calls except to the user's own providers, and no PII in logs, errors or fixtures.
- 🛡️ **Safety:** never write to a provider without a snapshot, an approved merge plan and an audit log entry.
- 🧠 **`@contact-fuse/core` stays pure:** no I/O and no provider code.
- 🧪 **Tests come with the change**, not in a follow-up.

## Using AI assistants

You may use AI tools. You are responsible for every line you submit. Project context for AI
agents is in [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
