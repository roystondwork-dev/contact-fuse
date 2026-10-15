# Product vision

> **contact-fuse** merges and de-duplicates contacts from several Google accounts into one, locally and safely.

Status: pre-alpha (milestone M0). Last reviewed: 2026-10-11.

## The problem

Many people sign in to their phone with several Google accounts: personal, work, an old address, a side business. Each account has its **own** contact list, and over the years those lists overlap:

- The same person appears in two, three or four accounts, each copy slightly different ("Rahul S" with a mobile number, "Rahul Sharma" with an email).
- The phone shows every copy, so search results are cluttered and calls show the wrong name.
- Google's built-in **Merge & fix** works only _inside one account_. Nothing in Google merges _across_ accounts.
- Existing third-party tools are mostly paid, closed-source and require uploading your whole address book to someone else's server.

## The solution

A small web app that runs **on your own computer** (`npx contact-fuse`). It:

1. Connects to each of your Google accounts with Google's official sign-in.
2. Takes a full **snapshot** (backup) before anything else.
3. **Scans** every contact across all accounts and finds likely duplicates.
4. Lets you **review** each suggested cluster and decide.
5. Shows a **dry run**: the exact changes it would make.
6. **Applies** the merge into the one **main account** you chose.
7. Optionally cleans up the **source accounts**.
8. Can **undo** a whole run.

## Who it's for

### Personas

| Persona                                           | Description                                                                                                                | Needs                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Priya, the multi-account phone user** (primary) | Non-developer with 3 Gmail accounts on an Android phone. Comfortable following a written guide, not comfortable with code. | One clean list, no lost contacts, clear instructions, confidence that nothing breaks. |
| **Sam, the privacy-conscious tinkerer**           | Technical user who refuses to upload contacts to cloud services.                                                           | Local-only processing, open source, auditable, no telemetry.                          |
| **Alex, the small-business owner**                | Customers spread across a personal and a business account.                                                                 | Merge everything into the business account, keep the personal account untouched.      |
| **Contributor Dev**                               | TypeScript developer who wants to add a provider (iCloud, Outlook) or improve matching.                                    | Clean architecture, good docs, fast tests.                                            |

## Goals

1. **Never lose a contact.** Every write is preceded by a snapshot and can be undone.
2. **Find duplicates people actually have**, across accounts, with explainable reasons ("same phone number").
3. **Keep the user in control.** Nothing is written without explicit approval of a merge plan.
4. **Stay private.** Contact data never leaves the user's machine except to talk to their own Google accounts.
5. **Be customisable.** Merge rules, thresholds, cleanup policy and exclusions are all configurable, with safe defaults.
6. **Be approachable.** A non-developer can go from zero to a merged list in under 30 minutes using the guides.

## Non-goals

- **No hosted service.** We will not run servers that hold user data.
- **No continuous background sync daemon in v1.** Scheduled sync is in "Later" on the [roadmap](roadmap.md).
- **No mobile app.** The phone gets the clean list through the user's Google account.
- **No contact enrichment** (looking people up on the internet). That conflicts with the privacy goal.
- **No CRM features** (notes, pipelines, reminders).
- **No silent automatic merging.** Even High-confidence clusters are only _preselected_ and the user still applies the plan.

## Product principles

1. **Safety over speed.** When in doubt, don't write. The default cleanup policy is `keep`.
2. **Explain every decision.** Each match shows the reasons and the score.
3. **Local first, offline friendly.** No remote fonts, analytics or CDNs at runtime.
4. **Sensible defaults, everything adjustable.** Beginners can click through, power users can tune.
5. **Provider-agnostic core.** Google is the first provider, not the only one (see [provider interface](../architecture/provider-interface.md)).
6. **Plain language.** See the [content style guide](../design/content-style-guide.md).

## Success metrics

There is no telemetry, so these are measured through GitHub, user testing and test suites, not tracking.

| Metric                                                                           | Target for v1.0                |
| -------------------------------------------------------------------------------- | ------------------------------ |
| Contacts lost or corrupted in reported runs                                      | **0**                          |
| Duplicate detection on the synthetic benchmark set: precision at High confidence | ≥ 98%                          |
| Duplicate detection: recall (High + Medium)                                      | ≥ 90%                          |
| Time from `npx contact-fuse` to first scan result (after Google setup)           | < 5 minutes for 5,000 contacts |
| Guided setup completed by a non-developer in moderated tests                     | ≥ 4 of 5 testers               |
| Undo restores the pre-run state in integration tests                             | 100%                           |
| Open issues labelled `data-loss`                                                 | 0 at every release             |

## Related

- [Roadmap](roadmap.md)
- [User flows](user-flows.md)
- [Glossary](glossary.md)
- [Architecture overview](../architecture/overview.md)
- [Security and privacy](../architecture/security-and-privacy.md)
