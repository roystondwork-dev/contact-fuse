---
name: new-adr
description: Use when making or proposing a significant architectural or technical decision for contact-fuse (new dependency category, new provider, data format change, security model change, replacing a tool) — creates a numbered ADR in docs/adr.
---

# Create an Architecture Decision Record

Format and rules: [docs/adr/README.md](../../../docs/adr/README.md). Template:
[docs/adr/template.md](../../../docs/adr/template.md).

## When an ADR is needed

Write one for decisions that are hard to reverse or affect many contributors: new framework or
library category, data model or snapshot format changes, security or privacy model, a new provider,
or a change to the merge safety model. Small, local choices don't need one.

## Steps

1. Find the next number: `ls docs/adr/` and take the highest `NNNN` plus 1, zero-padded to 4 digits.
2. Copy the template to `docs/adr/NNNN-kebab-case-title.md`. The title is a short decision statement,
   e.g. `0009-carddav-provider-via-tsdav.md`.
3. Fill in the sections: **Status** (`Proposed`), **Date** (today, ISO), **Context**, **Decision**,
   **Consequences** (positive and negative), and **Alternatives considered**.
4. If it replaces an earlier ADR, set the old one's status to `Superseded by NNNN` and link both ways.
   Never delete or rewrite accepted ADRs.
5. Add the ADR to the index table in `docs/adr/README.md`.
6. Update affected docs (architecture, standards, CLAUDE.md) to match the decision.
7. Open a PR titled `docs(adr): add ADR NNNN <title>`. The status becomes `Accepted` when it merges.
