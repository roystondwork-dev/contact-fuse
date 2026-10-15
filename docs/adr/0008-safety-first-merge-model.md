# 0008. Safety-first merge model

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** maintainers

## Context

contact-fuse writes to and can delete from users' real address books. Duplicate detection is
probabilistic; a wrong merge or deletion of a real person's contact is the worst possible outcome and
would destroy trust in the project. Contacts may also change on the user's phone while the app runs.

## Decision

Every write follows this non-negotiable sequence ([merge engine](../architecture/merge-engine.md)):

1. **Snapshot** of all touched accounts (raw payloads) before any write.
2. **Review**: only clusters the user approved are merged. High confidence is preselected; **Medium is
   never preselected**; Low is hidden by default.
3. **Dry run**: the complete plan is shown before applying; nothing is written while planning.
4. **Explicit confirmation**; any `delete` requires a second confirmation and is listed separately.
5. **Conservative defaults**: cleanup policy for source accounts is `keep`; deletes are opt-in.
6. **Conflict safety**: every update/delete is etag-checked; changed contacts are skipped, never overwritten.
7. **Ordering**: a source contact is only deleted after its survivor was successfully written.
8. **Audit log** of every operation, append-only, committed per batch.
9. **Undo** of a whole run from the audit log, with its limits stated in the UI before applying.

## Consequences

- Positive: mistakes are visible before they happen and reversible after.
- Positive: crash-safe resume from the audit log.
- Negative: more steps for the user; the UI must make the flow fast (good defaults, bulk approve High).
- Negative: storage grows with snapshots; retention settings manage it.
- Follow-ups: features that bypass any step require a new ADR superseding this one.

## Alternatives considered

| Option                                       | Why not                                                         |
| -------------------------------------------- | --------------------------------------------------------------- |
| Fully automatic merge (like many paid tools) | One wrong merge is unrecoverable trust damage                   |
| Use Google Contacts "Merge & fix" only       | Single-account only — the problem we exist to solve             |
| Undo via Google "Undo changes" only          | Coarse (whole list to a point in time), UI-only, not scriptable |
