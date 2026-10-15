# Content style guide

How contact-fuse talks to people: UI text, errors, docs and release notes. These rules exist because users trust us with their entire address book, so **every sentence should make them feel safe and in control.**

## Voice

| We are                                                         | We are not                                              |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| **Calm.** Reassuring and steady, especially around deletes.    | Alarmist, cute or jokey about data                      |
| **Plain.** Short words, short sentences.                       | Technical ("OAuth token refresh failed: invalid_grant") |
| **Honest.** We say exactly what will happen, including limits. | Vague ("Something went wrong") or over-promising        |
| **Respectful.** The user is in charge.                         | Bossy, or blaming the user                              |

## Tone by situation

| Situation                  | Tone                    | Example                                                                                  |
| -------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| Onboarding                 | Warm, encouraging       | "Let's tidy up your contacts. This takes about 10 minutes."                              |
| Routine actions            | Brief, neutral          | "Backup saved."                                                                          |
| Before destructive actions | Serious, precise        | "42 contacts will be deleted from personal@example.com. You can undo this from History." |
| Errors                     | Calm, helpful, no blame | "Google didn't respond. Check your internet connection and try again."                   |
| Success after a run        | Satisfied, factual      | "Done. 182 contacts merged into main@example.com."                                       |

## Microcopy rules

1. **Sentence case** everywhere: headings, buttons, labels, menu items. Write "Connect Google account", not "Connect Google Account".
2. **Buttons start with a verb and name the object:** "Save settings", "Delete 42 contacts", "Start scan". Never "OK", "Yes", "Submit".
3. **Be specific with numbers:** "Merge 12 clusters", not "Merge selected".
4. **Use "you" and "your"** for the user. Use "we" sparingly, and only for the app's promises ("We never upload your contacts").
5. **No exclamation marks**, except at most one in the final success screen.
6. **No jargon in the UI.** Use OAuth, etag, E.164, API and token only in docs and developer settings. In the UI say "sign in", "changed since your backup" and "phone number".
7. **Keep it short:** button labels ≤ 4 words, helper text ≤ 1 sentence, dialog bodies ≤ 3 sentences.
8. **Front-load the important part:** "Deleted contacts can be restored from History", not "From History, you can restore…".
9. **Use contractions** naturally: "don't", "can't", "you'll".
10. **No ALL CAPS** for emphasis. Use bold sparingly.
11. **Use full stops** at the end of full sentences in body text, helper text and toasts. Leave them off labels, buttons, headings and badges.
12. **Use the Oxford comma**, and **US English** spelling in the UI ("color" in code and UI strings). Docs may use either spelling but should be consistent within a file.

## Terminology

Use the [glossary](../product/glossary.md) terms. UI-facing labels for them:

| Glossary term        | Say in the UI                                                                   | Notes                                                                                               |
| -------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Account              | account / Google account                                                        |                                                                                                     |
| Main account         | main account                                                                    | Always marked with the `Star` icon                                                                  |
| Source accounts      | other accounts                                                                  | "Your other accounts" reads better than "source accounts" in UI                                     |
| Snapshot             | backup                                                                          | UI says "backup". Code and docs say snapshot.                                                       |
| Scan                 | scan / find duplicates                                                          | Button: "Find duplicates"                                                                           |
| Cluster              | "possible match" in lists, "these contacts" in detail. Never "duplicate group". | e.g. "24 possible matches". Detail heading: "These 3 contacts look like the same person"            |
| Confidence           | High / Medium / Low                                                             | Always capitalised as labels                                                                        |
| Survivor             | merged contact / result                                                         |                                                                                                     |
| Merge plan / dry run | preview                                                                         | Button: "Preview changes"                                                                           |
| Run                  | merge                                                                           | History lists "Merge on 11 Oct 2026, 21:04"                                                         |
| Undo                 | undo                                                                            | "Undo this merge"                                                                                   |
| Cleanup policy       | "After merging, other accounts should…"                                         | Options: "Stay as they are", "Get a 'Merged by contact-fuse' label", "Have merged contacts deleted" |
| Exclusion            | "Never merge"                                                                   |                                                                                                     |
| Conflict             | "changed since your backup"                                                     |                                                                                                     |

> UI copy may say "match" for a cluster because users understand it better. Code, API and docs must still use **cluster**.

**Product name:** always lowercase **contact-fuse**, even at the start of a sentence (rephrase if that looks awkward). Never "ContactFuse" or "Contact Fuse".

**Google:** "Google account", "Google Contacts", "Gmail" (only when referring to the email product).

## Formatting

### Dates and times

- Use the browser locale through `Intl.DateTimeFormat`. Never hand-format dates.
- Recent events (< 7 days) use a relative format: "2 minutes ago", "yesterday at 21:04".
- Older events use an absolute format, for example "11 Oct 2026, 21:04" (en-GB) or "Oct 11, 2026, 9:04 PM" (en-US), whatever the locale gives.
- Show exact timestamps in a tooltip, using ISO 8601 in exports and logs (`2026-10-11T21:04:00Z`).
- Birthdays without a year are shown as "11 Oct" and never invented.

### Numbers

- Use `Intl.NumberFormat` with the browser locale: "12,345" (en-US), "12.345" (de-DE).
- Use `tabular-nums` in tables and counters.
- Scores are whole numbers 0–100, without "%": "Score 92".
- Pluralise correctly with `Intl.PluralRules`: "1 contact", "2 contacts", and "No contacts" for zero.

### Phone numbers

- Store and compare in E.164 (`+919876543210`).
- Display in international format via `libphonenumber-js` `formatInternational()`: `+91 98765 43210`.
- If a number cannot be parsed, show it exactly as stored, followed by a muted "(unrecognised format)".
- Never truncate phone numbers.

### Emails

- Display as stored (keep original casing). Compare lowercase.
- In headings and summaries, account emails may be shortened to the local part plus "@…" only when space requires it, with the full address in a tooltip.

### Names

- Display the contact's display name. Fall back to given + family name, then the first email, then the first phone, then "Unnamed contact".

## Example strings

### Onboarding

| Element            | Text                                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome title      | Tidy up your contacts                                                                                                                                                      |
| Welcome body       | contact-fuse finds the same people across your Google accounts and merges them into one list. Everything runs on this computer. Your contacts are never uploaded anywhere. |
| Primary button     | Get started                                                                                                                                                                |
| Google setup title | Connect contact-fuse to Google                                                                                                                                             |
| Google setup body  | Google needs you to create a free "OAuth client" so this app can read your contacts. It takes about 5 minutes.                                                             |
| Link               | Open the step-by-step guide                                                                                                                                                |
| Fields             | Client ID · Client secret                                                                                                                                                  |
| Helper (client ID) | Ends with `.apps.googleusercontent.com`                                                                                                                                    |

### Accounts

| Element           | Text                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Empty title       | No accounts yet                                                                                                |
| Empty body        | Connect a Google account to get started. You can add as many as you like.                                      |
| Button            | Connect Google account                                                                                         |
| Account card meta | 1,204 contacts · connected 2 days ago                                                                          |
| Main badge        | Main account                                                                                                   |
| Disconnect dialog | **Disconnect work@example.com?** contact-fuse will stop accessing this account. Nothing in Google will change. |

### Scan and review

| Element        | Text                                             |
| -------------- | ------------------------------------------------ |
| Button         | Find duplicates                                  |
| Progress       | Comparing contacts… 4,210 of 12,000              |
| Summary        | 24 possible matches · 15 High · 7 Medium · 2 Low |
| No results     | No duplicates found. Your contacts are tidy.     |
| Detail heading | These 3 contacts look like the same person       |
| Reasons        | Same phone number · Same email · Similar name    |
| Bulk action    | Approve all High (15)                            |
| Reject toast   | Match rejected. [Undo]                           |

### Preview and apply

| Element                | Text                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Button                 | Preview changes                                                                                           |
| Preview summary        | 18 contacts will be updated and 6 created in main@example.com. Your other accounts will stay as they are. |
| Apply button           | Merge 24 contacts                                                                                         |
| Confirm dialog title   | Merge 24 contacts into main@example.com?                                                                  |
| Confirm dialog body    | We'll back up all accounts first. You can undo this merge from History.                                   |
| Delete type-to-confirm | Type 42 to confirm deleting 42 contacts from your other accounts.                                         |
| Progress               | Merging… 120 of 182. You can close this tab. The merge will keep going.                                   |
| Success                | Done. 182 contacts merged into main@example.com.                                                          |
| Partial                | 179 contacts merged. 3 were skipped because they changed since your backup. [See skipped contacts]        |

### Errors

Pattern: **what happened**, then **why** (if known), then **what to do**. Every error shown to users includes a short code (e.g. `GOOGLE_RATE_LIMITED`) in the "Copy details" content, not in the main sentence.

| Situation (code)                        | Text                                                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Network down (`NETWORK_ERROR`)          | Can't reach Google. Check your internet connection and try again.                                           |
| Sign-in cancelled (`OAUTH_CANCELLED`)   | Sign-in was cancelled. Nothing was changed.                                                                 |
| Sign-in expired (`OAUTH_TOKEN_EXPIRED`) | Your sign-in for work@example.com has expired. Google does this every 7 days for test apps. [Sign in again] |
| Invalid client (`OAUTH_INVALID_CLIENT`) | Google didn't accept the client ID or secret. Check them in Settings, or follow the setup guide again.      |
| Not a test user (`OAUTH_ACCESS_DENIED`) | Google blocked this sign-in. Add this email as a test user in your Google Cloud project. [How to fix this]  |
| Rate limited (`GOOGLE_RATE_LIMITED`)    | Google asked us to slow down. We'll keep trying automatically.                                              |
| Contact changed (`ETAG_CONFLICT`)       | Rahul Sharma changed in Google after your backup, so we skipped it to avoid overwriting your edits.         |
| Run interrupted (`RUN_INTERRUPTED`)     | The merge stopped before it finished. 120 of 182 contacts were merged. [Resume] [Undo what was done]        |
| Unknown (`INTERNAL_ERROR`)              | Something unexpected happened and nothing more was changed. [Copy details] to include in a bug report.      |

Never put contact data (names, numbers, emails) in error **codes** or copied details. The "Copy details" text includes only the code, request ID, app version and OS.

## Docs and release notes

- Docs use second person, present tense and imperative steps ("Click **Create**").
- Format UI labels in **bold** exactly as they appear in the UI.
- Format code, commands, file names and env vars in `code`.
- Release notes are written for users first ("You can now…"), with developer details below.
- Inclusive language: "allowlist/denylist", "main", "primary/replica". Never "master/slave" or "whitelist/blacklist".
