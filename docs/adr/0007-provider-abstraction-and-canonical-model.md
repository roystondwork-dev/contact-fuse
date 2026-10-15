# 0007. Provider abstraction and canonical contact model

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** maintainers

## Context

v1 supports Google, but users also keep contacts in iCloud, Outlook and other CardDAV servers. If
matching and merging logic used Google's `Person` type directly, every new source would mean rewriting
the engines and their tests.

## Decision

- `@contact-fuse/core` defines a **canonical `Contact` model** and all matching/merge logic works only
  on it. Core has no I/O.
- Each source is a **provider package** (`@contact-fuse/provider-<name>`) implementing the
  `ContactProvider` interface ([provider interface](../architecture/provider-interface.md)): mapping to and
  from `Contact`, listing with optional sync tokens, batched writes with per-item outcomes, labels, and
  declared capabilities and limits.
- Providers return the **raw native payload** alongside the canonical contact; it is stored in snapshots
  so restore/undo is exact even for fields the canonical model does not cover.
- Updates write only the fields contact-fuse manages, preserving everything else.

## Consequences

- Positive: engines are tested once, with synthetic canonical data, independent of any API.
- Positive: new providers are additive packages.
- Negative: the canonical model is a lowest common denominator; provider-specific features need
  capability flags.
- Negative: mapping code must be round-trip tested carefully to avoid silent data loss.

## Alternatives considered

| Option                                    | Why not                                                |
| ----------------------------------------- | ------------------------------------------------------ |
| Use vCard as the internal model           | Verbose, stringly-typed, awkward to compute on         |
| Use Google `Person` as the internal model | Couples everything to Google                           |
| Generic plugin system loaded at runtime   | Over-engineered for a handful of first-party providers |
