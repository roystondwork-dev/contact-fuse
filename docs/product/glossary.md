# Glossary

The terms below are used consistently in the code, the UI, the docs and issues. If a term isn't here, don't invent a synonym: add it here in the same pull request.

| Term                | Definition                                                                                                                                                           | In code                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Account**         | One connected contact source belonging to the user, currently a Google account.                                                                                      | `Account`, `accountId`                       |
| **Audit log**       | Append-only record of every operation a run performed (or skipped), with before/after data. It makes undo possible.                                                  | `audit_log_entries` table                    |
| **Blocking**        | Matching-engine step that groups contacts sharing a key (phone, email, name key) so only plausible pairs are scored. Also called candidate generation.               | `generateCandidates()`                       |
| **Canonical model** | The provider-agnostic `Contact` shape every provider maps to and from.                                                                                               | `Contact` in `@contact-fuse/core`            |
| **Cleanup policy**  | What happens to merged contacts in source accounts: `keep` (default), `label` or `delete`.                                                                           | `CleanupPolicy`                              |
| **Cluster**         | Group of contacts believed to be the same person.                                                                                                                    | `Cluster`                                    |
| **Confidence**      | Band derived from a cluster's score: **High** (≥ 85, preselected), **Medium** (60–84, user decides), **Low** (< 60, hidden by default). Thresholds are configurable. | `Confidence` = `"high" \| "medium" \| "low"` |
| **Conflict**        | A contact changed in Google after the snapshot (detected via its version/etag). It is skipped and reported, never overwritten.                                       | `ETAG_CONFLICT`                              |
| **Contact**         | A single person entry. In docs it means the canonical `Contact` unless stated otherwise.                                                                             | `Contact`                                    |
| **Default region**  | Country used to interpret phone numbers without an international prefix.                                                                                             | `defaultRegion` (ISO 3166-1 alpha-2)         |
| **Dry run**         | Preview of a merge plan that shows every change without writing anything.                                                                                            | `dryRun`                                     |
| **E.164**           | International phone format, e.g. `+919876543210`. All phones are compared in this form.                                                                              | `phoneE164`                                  |
| **Exclusion**       | A contact or label that must never be merged.                                                                                                                        | `Exclusion`                                  |
| **Main account**    | The account that merged contacts are written to. Exactly one per configuration.                                                                                      | `mainAccountId`                              |
| **Match**           | A scored pair of contacts (0–100) with the list of reasons.                                                                                                          | `Match`, `MatchReason`                       |
| **Match reason**    | Why two contacts matched, e.g. `same-phone`, `same-email`, `similar-name`.                                                                                           | `MatchReason`                                |
| **Merge plan**      | Full list of operations computed from approved clusters and merge rules. What the dry run displays and a run executes.                                               | `MergePlan`, `PlanOperation`                 |
| **Merge rules**     | Per-field strategy used to build the survivor: `prefer-main`, `newest`, `most-complete`, `union`.                                                                    | `MergeRules`, `FieldStrategy`                |
| **Normalisation**   | Converting raw values to comparable forms (lowercase emails, E.164 phones, folded names).                                                                            | `normalize*()`                               |
| **Operation**       | One step of a merge plan: `create`, `update`, `delete` or `label`, against one account.                                                                              | `PlanOperation`                              |
| **Other contacts**  | Google's auto-saved addresses from Gmail. Read-only. Included optionally.                                                                                            | `includeOtherContacts`                       |
| **Provider**        | Integration with a contact source: `google` now, `carddav` and `microsoft` later.                                                                                    | `ContactProvider`, `providerId`              |
| **Resource ID**     | The provider's own identifier for a contact (Google `resourceName`, e.g. `people/c123`).                                                                             | `resourceId`                                 |
| **Run**             | One execution of a merge plan (or of an undo). Has a status: `pending`, `running`, `completed`, `interrupted`, `failed`.                                             | `MergeRun`                                   |
| **Scan**            | One run of the matching engine over a snapshot, producing clusters.                                                                                                  | `Scan`                                       |
| **Score**           | Number 0–100 expressing how likely two contacts are the same person.                                                                                                 | `score`                                      |
| **Snapshot**        | Full backup of every connected account's contacts, taken before any write. Exportable as vCard 4.0 or CSV.                                                           | `Snapshot`                                   |
| **Source accounts** | All connected accounts other than the main account.                                                                                                                  | `sourceAccountIds`                           |
| **Strictness**      | Preset for matching thresholds: `strict`, `balanced` (default), `loose`, or `custom`.                                                                                | `Strictness`                                 |
| **Survivor**        | The resulting merged contact for a cluster, written to the main account.                                                                                             | `survivor`                                   |
| **Undo**            | A run that reverses a previous run, using its audit log and the pre-run snapshot.                                                                                    | `undoRun()`                                  |
| **Version**         | Provider version stamp for a contact (Google `etag`), used for conflict detection.                                                                                   | `ContactRef.version`                         |

## Words we avoid

| Avoid             | Use instead  | Why                                                         |
| ----------------- | ------------ | ----------------------------------------------------------- |
| sync (for v1)     | merge        | v1 merges once; continuous sync is a later feature          |
| primary account   | main account | One term only                                               |
| duplicate group   | cluster      | One term only                                               |
| backup (in code)  | snapshot     | "Backup" is fine in UI copy, but code and docs use snapshot |
| wipe, nuke, purge | delete       | Plain, unambiguous language                                 |
| master            | main         | Inclusive language                                          |

See also the [content style guide](../design/content-style-guide.md).
