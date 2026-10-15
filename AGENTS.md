# AGENTS.md

Instructions for AI coding agents (Codex, Cursor, Copilot, Gemini, Claude and others) working in this
repository.

**The single source of truth is [CLAUDE.md](CLAUDE.md).** Read it first. It covers the stack,
commands, layout and golden rules. It applies to every agent, not only Claude.

Then use the docs relevant to your task:

- Standards: [docs/standards/](docs/standards/coding-standards.md), especially
  [naming](docs/standards/naming-conventions.md) and [testing](docs/standards/testing.md)
- Architecture: [docs/architecture/overview.md](docs/architecture/overview.md) and [ADRs](docs/adr/README.md)
- Process: [docs/process/definition-of-done.md](docs/process/definition-of-done.md)
- Task playbooks: [.claude/skills/](.claude/skills/) (plain Markdown, usable by any agent)

Non-negotiable: never log or commit PII or tokens, keep `packages/core` free of I/O, and never
weaken the backup → approval → dry run → audit log → undo safety model.
