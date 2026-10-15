# contact-fuse documentation

Everything about how contact-fuse is designed, built and run. If you are new, read the
**Start here** row first, then whichever section matches what you are doing.

| I want to…                 | Read                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Start here**             | [Vision](product/vision.md) → [Architecture overview](architecture/overview.md) → [Development setup](guides/development-setup.md) |
| Use contact-fuse           | [Google Cloud setup](guides/google-cloud-setup.md), [Troubleshooting](guides/troubleshooting.md)                                   |
| Contribute code            | [CONTRIBUTING](../CONTRIBUTING.md), [Coding standards](standards/coding-standards.md), [Git workflow](process/git-workflow.md)     |
| Build UI                   | [Design system](design/design-system.md), [UI guidelines](design/ui-guidelines.md)                                                 |
| Understand a past decision | [Architecture Decision Records](adr/README.md)                                                                                     |

## Product

- [Vision](product/vision.md): the problem, who it's for, goals and non-goals
- [Roadmap](product/roadmap.md): milestones M0–M4 and beyond
- [User flows](product/user-flows.md): every journey through the app
- [Glossary](product/glossary.md): the exact meaning of _main account_, _cluster_, _survivor_, _run_…

## Architecture

- [Overview](architecture/overview.md): components and how they talk
- [Project structure](architecture/project-structure.md): where every kind of code lives
- [Data model](architecture/data-model.md)
- [Provider interface](architecture/provider-interface.md): how Google (and later iCloud, Outlook) plug in
- [Matching engine](architecture/matching-engine.md): how duplicates are found and scored
- [Merge engine](architecture/merge-engine.md): plans, dry runs, execution and undo
- [Security and privacy](architecture/security-and-privacy.md): threat model and guarantees
- [Architecture Decision Records](adr/README.md)

## Standards

- [Coding standards](standards/coding-standards.md)
- [Naming conventions](standards/naming-conventions.md)
- [Testing](standards/testing.md)
- [Error handling and logging](standards/error-handling-and-logging.md)
- [API design](standards/api-design.md)
- [Database](standards/database.md)
- [Dependencies](standards/dependencies.md)
- [Documentation](standards/documentation.md)

## Design

- [Design system](design/design-system.md): colours, type, spacing, tokens
- [UI guidelines](design/ui-guidelines.md): components, states, destructive actions
- [Accessibility](design/accessibility.md)
- [Content style guide](design/content-style-guide.md): voice, tone, wording

## Guides

- [Development setup](guides/development-setup.md): from a fresh Mac to a running app
- [Google Cloud setup](guides/google-cloud-setup.md): create your own OAuth client
- [Troubleshooting](guides/troubleshooting.md)

## Process

- [Git workflow](process/git-workflow.md)
- [Code review](process/code-review.md)
- [Definition of done](process/definition-of-done.md)
- [Release process](process/release-process.md)
- [Issue triage](process/issue-triage.md)
- [CI/CD](process/ci-cd.md)

## Keeping docs healthy

Docs change in the **same pull request** as the code they describe. A significant decision
gets an [ADR](adr/README.md). See [Documentation standards](standards/documentation.md).
