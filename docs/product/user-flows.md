# User flows

The main journeys through contact-fuse. Screen names in **bold** match the UI. Terms follow the [glossary](glossary.md). Screen design rules are in the [UI guidelines](../design/ui-guidelines.md).

## Overview

```mermaid
flowchart LR
  A[Launch<br/>npx contact-fuse] --> B[Onboarding]
  B --> C[Connect accounts]
  C --> D[Pick main account]
  D --> E[Snapshot]
  E --> F[Scan]
  F --> G[Review clusters]
  G --> H[Dry run]
  H --> I[Apply]
  I --> J[Cleanup]
  J --> K[Done]
  K -. optional .-> L[Undo]
```

Every step before **Apply** is read-only for Google.

---

## 1. Launch and onboarding

```mermaid
flowchart TD
  start([User runs npx contact-fuse]) --> srv[Server starts on 127.0.0.1:4317]
  srv --> open[Browser opens automatically]
  open --> first{First run?}
  first -- No --> home[Home dashboard]
  first -- Yes --> welcome[Welcome screen:<br/>what it does + privacy promise]
  welcome --> creds{OAuth client<br/>configured?}
  creds -- No --> guide[Google setup step:<br/>link to guide, paste client ID & secret]
  guide --> validate{Valid format?}
  validate -- No --> guide
  validate -- Yes --> region[Pick default country<br/>for phone numbers]
  creds -- Yes --> region
  region --> connect[Go to Connect accounts]
```

- The privacy promise is shown before any sign-in: _"Your contacts stay on this computer."_
- The client secret is stored in the OS keychain, never shown again in full.

## 2. Connect accounts

```mermaid
flowchart TD
  a[Accounts screen] --> b[Click 'Connect Google account']
  b --> c[Google consent page opens in browser]
  c --> d{User approves?}
  d -- No / closes tab --> e[Back on Accounts:<br/>'Sign-in was cancelled.']
  d -- Yes --> f[Redirect to 127.0.0.1 loopback callback]
  f --> g{State + PKCE valid?}
  g -- No --> h[Error: 'Sign-in could not be verified. Try again.']
  g -- Yes --> i[Token saved to keychain]
  i --> j[Account card appears<br/>with email + contact count]
  j --> k{Add another?}
  k -- Yes --> b
  k -- No --> l[Continue]
```

- Connecting the same account twice updates the existing account instead of duplicating it.
- At least **2 accounts** are recommended. One account is allowed (in-account de-duplication).

## 3. Pick main account

```mermaid
flowchart TD
  a[Main account screen] --> b[List of connected accounts<br/>with contact counts]
  b --> c[User selects one]
  c --> d[Explain: merged contacts are written here;<br/>other accounts are source accounts]
  d --> e[Save]
```

The main account can be changed at any time before a run. Changing it invalidates any existing merge plan.

## 4. Snapshot (backup)

```mermaid
flowchart TD
  a[Fetch all accounts] --> b{All fetched OK?}
  b -- No --> c[Show which account failed + Retry]
  c --> a
  b -- Yes --> d[Store snapshot in local database]
  d --> e[Offer export: vCard 4.0 / CSV]
  e --> f[Snapshot listed with date + counts]
```

- A snapshot is taken automatically on the first fetch and **always** right before a run.
- Snapshots are listed under **Backups** and can be exported or deleted.

## 5. Scan

```mermaid
flowchart TD
  a[Click 'Find duplicates'] --> b[Normalise contacts]
  b --> c[Generate candidates]
  c --> d[Score pairs]
  d --> e[Build clusters]
  e --> f[Assign confidence]
  f --> g{Any clusters?}
  g -- No --> h[Empty state:<br/>'No duplicates found. Your contacts are tidy.']
  g -- Yes --> i[Scan results summary:<br/>N clusters, High/Medium/Low counts]
```

Progress is shown as a determinate bar with the current stage name. A scan can be cancelled.

## 6. Review clusters

```mermaid
flowchart TD
  a[Scan results] --> b[Filter by confidence / account / reason]
  b --> c[Open cluster]
  c --> d[See contacts side by side<br/>+ match reasons + proposed survivor]
  d --> e{Decision}
  e -- Approve --> f[Mark approved]
  e -- Reject --> g[Mark rejected<br/>optionally 'never suggest again' = exclusion]
  e -- Edit --> h[Pick field values manually<br/>or split the cluster]
  h --> f
  f --> i{More clusters?}
  g --> i
  i -- Yes --> c
  i -- No --> j[Continue to dry run]
  a --> k[Bulk: 'Approve all High']
  k --> i
```

- High clusters are **preselected**, not approved. The user still confirms them, individually or in bulk.
- Medium clusters require an explicit decision. Low clusters are hidden unless "Show low confidence" is on.

## 7. Settings and merge rules

```mermaid
flowchart TD
  a[Settings] --> b[Matching: strictness preset<br/>or custom thresholds]
  a --> c[Merge rules per field:<br/>prefer-main / newest / most-complete / union]
  a --> d[Cleanup policy:<br/>keep / label / delete]
  a --> e[Exclusions: contacts + labels]
  a --> f[Default phone region]
  a --> g[Include 'Other contacts']
  b & c & d & e & f & g --> h[Save]
  h --> i{Existing scan or plan?}
  i -- Yes --> j[Banner: 'Settings changed. Re-scan to apply.']
  i -- No --> k[Done]
```

## 8. Dry run

```mermaid
flowchart TD
  a[Approved clusters + rules] --> b[Generate merge plan]
  b --> c[Dry run screen:<br/>totals by operation type]
  c --> d[Per-contact diff:<br/>before → after]
  d --> e{Looks right?}
  e -- No --> f[Back to review]
  e -- Yes --> g[Continue to apply]
```

The dry run shows, in order: contacts **created** in the main account, contacts **updated** in the main account, and what happens to source contacts under the cleanup policy.

## 9. Apply

```mermaid
flowchart TD
  a[Apply screen: summary + confirm] --> b{Cleanup policy = delete?}
  b -- Yes --> c[Type-to-confirm dialog:<br/>type the number of contacts to delete]
  b -- No --> d[Confirm dialog]
  c --> e[Take pre-run snapshot]
  d --> e
  e --> f[Execute operations in batches]
  f --> g{Conflict / error?}
  g -- etag conflict --> h[Skip contact, record in audit log]
  g -- rate limit --> i[Back off + retry]
  g -- fatal --> j[Stop run, mark 'interrupted',<br/>offer resume or undo]
  h --> f
  i --> f
  g -- none --> k[Run complete:<br/>summary + skipped list]
```

Users must not close the browser tab during a run, though closing it does not break anything because the run executes on the server. Reopening the app shows the run's progress.

## 10. Cleanup (source accounts)

Cleanup is part of the run and follows the cleanup policy:

| Policy           | Effect on merged source contacts                                                         |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `keep` (default) | Untouched                                                                                |
| `label`          | Added to a "Merged by contact-fuse" label so the user can review them in Google Contacts |
| `delete`         | Deleted from the source account (requires type-to-confirm; restorable by undo)           |

## 11. Undo

```mermaid
flowchart TD
  a[History screen] --> b[Select a run]
  b --> c[Undo preview:<br/>what will be restored/removed]
  c --> d{Contacts changed<br/>since the run?}
  d -- Yes --> e[Warn: these contacts were edited after the run<br/>and will be skipped unless 'force' is chosen]
  d -- No --> f[Confirm]
  e --> f
  f --> g[Execute undo as a new run<br/>with its own audit log]
  g --> h[Undo complete]
```

Undo itself is a run, so it is recorded and can in turn be undone.

## 12. Export

From **Backups**: choose a snapshot → choose a format (vCard 4.0 or CSV) → choose the accounts (all or some) → the browser downloads the file. Exports are generated locally. A notice reminds the user the file contains personal data.

## 13. Disconnect and delete local data

```mermaid
flowchart TD
  a[Accounts screen] --> b[Disconnect account]
  b --> c[Revoke token with Google + remove from keychain]
  c --> d{Also delete this account's<br/>local snapshots?}
  d -- Yes --> e[Delete rows]
  d -- No --> f[Keep for export]
  g[Settings → Danger zone] --> h[Delete all local data]
  h --> i[Type-to-confirm 'delete']
  i --> j[Revoke all tokens, wipe database,<br/>clear keychain entries]
  j --> k[Return to welcome screen]
```

Disconnecting never deletes anything in Google.
