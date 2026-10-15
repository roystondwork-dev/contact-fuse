# 0001. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** maintainers

## Context

contact-fuse is a new open-source project expected to have many contributors over time, including AI
coding agents. Decisions made early (stack, safety model, privacy) shape everything else. Without a
record, newcomers re-open settled debates or unknowingly break assumptions.

## Decision

We will record significant decisions as Architecture Decision Records in `docs/adr/`, using the
lightweight MADR-style [template](template.md), numbered sequentially (`NNNN-kebab-title.md`). Accepted
ADRs are immutable; changes happen through superseding ADRs. The process is described in the
[ADR index](README.md).

## Consequences

- Positive: decisions are discoverable and reviewable in PRs, next to the code.
- Positive: AI agents can read ADRs to stay within constraints.
- Negative: small overhead for significant changes.
- Follow-ups: CLAUDE.md and CONTRIBUTING.md point to this folder.

## Alternatives considered

| Option                     | Why not                                      |
| -------------------------- | -------------------------------------------- |
| Wiki pages                 | Not versioned with code; not reviewed in PRs |
| Decisions in issue threads | Hard to find; no final, single statement     |
| No formal record           | Context is lost as contributors change       |
