# UI guidelines

How to build screens in `apps/web`. Visual tokens come from the [design system](design-system.md), words from the [content style guide](content-style-guide.md) and requirements from [accessibility](accessibility.md). Flows are described in [user flows](../product/user-flows.md).

## Core rules

1. **The user's data is the hero.** Chrome stays neutral. Use colour for meaning (status, confidence, danger), not decoration.
2. **One primary action per screen.** Every other button is secondary, ghost or link style.
3. **Show what will happen before it happens.** Any write has a preview (dry run) and a confirmation.
4. **Every async view has four states:** loading, empty, error and success. Design all four.
5. **Never block on the browser tab.** Long work runs on the server. The UI shows progress and survives a reload.

## Layout

### App shell

```
┌───────────────────────────────────────────────────────────┐
│ Top bar: logo · current step · theme toggle · privacy badge│
├────────────┬──────────────────────────────────────────────┤
│ Sidebar    │ Page                                         │
│ (≥ lg)     │  ┌ Page header ───────────────────────────┐  │
│ Accounts   │  │ H1 title          [secondary] [primary]│  │
│ Backups    │  │ one-line description                   │  │
│ Duplicates │  └────────────────────────────────────────┘  │
│ History    │  Content (max-w-5xl; tables may go wider)    │
│ Settings   │                                              │
└────────────┴──────────────────────────────────────────────┘
```

- Below `lg`, the sidebar becomes a `Sheet` opened from a menu button in the top bar.
- Gutters are 16 px on mobile and 24 px from `md` upward.
- The page header always has an H1 and an optional description, with actions on the right (they stack below the title on small screens).
- A **"Local only"** privacy badge (`Lock` icon) is always visible in the top bar and links to the privacy explanation.

### Navigation

| Item       | Route           | Icon              |
| ---------- | --------------- | ----------------- |
| Accounts   | `/accounts`     | `CircleUserRound` |
| Backups    | `/backups`      | `Archive`         |
| Duplicates | `/scans/latest` | `ScanSearch`      |
| History    | `/runs`         | `Undo2`           |
| Settings   | `/settings`     | `Settings`        |

Onboarding (`/welcome`) uses a centred, single-column layout without the sidebar, with a stepper showing _Set up Google → Connect → Main account → Backup_.

## Components

Built on **shadcn/ui** (Radix primitives). The components are copied into `apps/web/src/components/ui/` and themed exclusively with semantic tokens. Feature components live in `apps/web/src/features/<feature>/components/`.

| Need                | Use                                             | Notes                                                                                               |
| ------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Action              | `Button`                                        | Variants: `primary`, `secondary`, `ghost`, `destructive`, `link`. Sizes `sm`, `md` (default), `lg`. |
| Icon-only action    | `Button size="icon"` + `aria-label` + `Tooltip` | Always both label and tooltip                                                                       |
| Confirmation        | `AlertDialog`                                   | Never `window.confirm`                                                                              |
| Form                | `Form` (react-hook-form + Zod resolver)         | Same Zod schema as the API where possible                                                           |
| Single choice (≤ 5) | `RadioGroup`                                    | e.g. cleanup policy                                                                                 |
| Single choice (> 5) | `Select` / `Combobox`                           | e.g. default region                                                                                 |
| On/off setting      | `Switch`                                        | Takes effect when the settings form is saved, not on toggle                                         |
| Status              | `Badge`                                         | Always icon + label                                                                                 |
| Notice on a page    | `Alert`                                         | info / warning / danger                                                                             |
| Transient feedback  | `Toast` (sonner)                                | See below                                                                                           |
| Side panel          | `Sheet`                                         | Mobile nav, cluster detail on small screens                                                         |
| Long list           | `Table` + TanStack Table                        | Sorting, filtering, selection                                                                       |
| Progress            | `Progress`                                      | Determinate whenever the total is known                                                             |
| Loading placeholder | `Skeleton`                                      | Matching the final layout                                                                           |
| Tabs                | `Tabs`                                          | Within a page, not as primary navigation                                                            |

Do not add a new UI library without an [ADR](../adr/README.md). See the `ui-component` skill in `.claude/skills/`.

## States

| State                     | Pattern                                                                                                                   | Example                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Loading (< 300 ms)**    | Show nothing new (avoid flicker)                                                                                          | Switching tabs                                                                       |
| **Loading (> 300 ms)**    | `Skeleton` in the shape of the content                                                                                    | Account list                                                                         |
| **Long task**             | `Progress` + stage label + cancel button when safe                                                                        | "Scanning: scoring 4,210 of 12,000 pairs"                                            |
| **Empty**                 | Icon (24–48 px) + one-sentence title + one-sentence explanation + one primary action                                      | "No accounts yet. Connect a Google account to get started. [Connect Google account]" |
| **Error (recoverable)**   | `Alert variant="danger"` inline, where the failure happened: what happened, why if known, what to do + Retry              | "Couldn't load contacts from work@… Google didn't respond. [Try again]"              |
| **Error (page-level)**    | Error boundary card with a "Reload" button and a "Copy details" button (copies the error code and request ID, **no PII**) | Unexpected crash                                                                     |
| **Success (in place)**    | Updated content + toast                                                                                                   | "Backup saved."                                                                      |
| **Success (end of flow)** | Summary page with counts + next step                                                                                      | Run complete                                                                         |
| **Partial success**       | `Alert variant="warning"` with counts + link to details                                                                   | "Merged 182 contacts. 3 were skipped because they changed in Google."                |
| **Disabled**              | Disabled control + text explaining why (tooltip or helper text)                                                           | "Connect at least one account to scan."                                              |

## Destructive and irreversible actions

Destructive means anything that **deletes or overwrites** data in Google or locally.

1. **Visual:** `Button variant="destructive"` with the `Trash2` icon and a specific verb ("Delete 42 contacts", not "OK").
2. **Separate:** keep it away from the primary action. In settings it lives in a bordered **Danger zone** section at the bottom.
3. **Confirm with consequences:** an `AlertDialog` states exactly what will happen, how many items, in which account, and whether undo is possible.
4. **Type-to-confirm** for:
   - Applying a run with cleanup policy `delete`: the user types the **number** of contacts to be deleted.
   - "Delete all local data": the user types `DELETE` (the same value the API requires as `confirm`).
     The confirm button stays disabled until the input matches exactly. Focus starts on **Cancel**, never on the destructive button.
5. **Prefer undo over confirmation** for low-risk local actions (e.g. rejecting a cluster): act immediately and show a toast with an **Undo** action for 8 seconds.

```
┌─ Delete merged contacts from 2 source accounts? ───────────┐
│ 42 contacts will be deleted from personal@… and old@….     │
│ They are included in today's backup and you can undo this  │
│ run from History.                                          │
│                                                            │
│ Type 42 to confirm: [____]                                 │
│                                    [Cancel] [Delete 42]    │
└────────────────────────────────────────────────────────────┘
```

## Data tables

Used for contacts in a backup, clusters, run operations and the audit log.

- Header row uses `surface-muted`. Rows are separated by `border`, without zebra stripes.
- Numeric columns are right-aligned with `tabular-nums`.
- Sorting goes through header buttons with `aria-sort`, and the sort direction is shown with an icon.
- Selection uses checkboxes in the first column. Bulk actions appear in a toolbar above the table when one or more rows are selected ("12 selected · Approve · Reject").
- Use pagination for large data (page size 50/100/250). Use virtualisation (TanStack Virtual) only for read-only lists over 1,000 rows.
- Filters live in a toolbar above the table, and active filters are shown as removable chips.
- Empty-after-filter state: "No clusters match these filters. [Clear filters]".
- Long values are truncated with an ellipsis and the full value in a tooltip. Phone numbers and emails are never truncated in diff views.
- Below `md`, rows collapse into stacked cards.

## Cluster review and merge diff view

The most important screen in the product.

### Cluster card (list)

```
[✓] [ShieldCheck High · 92]  Rahul Sharma            3 contacts · 2 accounts
    Same phone · Same email · Similar name                     [Review →]
```

### Cluster detail (compare)

- Columns: one per contact in the cluster (account email + `Star` icon if it's in the main account), plus a final **Result** column showing the survivor.
- Rows: one per field (name, phones, emails, organisation, birthday, notes, labels).
- In each row the chosen value is highlighted with `primary-subtle` and a `Check` icon. The user can click a different value to override, or use the checkbox for `union` fields.
- Match reasons are shown at the top as badges ("Same phone +91 98765 43210").
- Actions: **Approve** (primary), **Reject** (secondary), **Split cluster** (ghost, opens a dialog to move contacts out).
- On small screens, the contacts become stacked cards with the Result card pinned at the bottom.

### Dry-run diff

For each operation:

```
UPDATE  main@…  Rahul Sharma
  Phones   +91 98765 43210            (unchanged)
         + +91 22 2345 6789            ← from work@…
  Emails   rahul@example.com          (unchanged)
         + rahul.s@example.org         ← from personal@…
  Company  ─ (empty)  →  Example Ltd   ← from work@…
```

- Added lines are prefixed with `+` and use `success` text with a `success-subtle` background. Removed lines use `−` with `danger` and `danger-subtle`. Changed values are shown as `old → new`.
- Colour is **never** the only signal: the `+`/`−` prefixes and "added"/"removed" screen-reader text are required.
- Operations are grouped by type (Create / Update / Label / Delete) with counts in collapsible section headers.
- The dry run is downloadable as JSON for auditing.

## Notifications and toasts

| Use a toast for                                                               | Don't use a toast for                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| Confirming a completed user action ("Settings saved.")                        | Errors that need action, which go in an inline `Alert` |
| Undoable, low-risk actions ("Cluster rejected. [Undo]")                       | Anything the user must read to stay safe               |
| Background completion while on another page ("Scan finished. [View results]") | Run results, which go on the summary page              |

- Position: bottom-right on desktop, bottom-centre on mobile. At most 3 visible.
- Duration: 5 s by default, 8 s with an action, and errors persist until dismissed.
- Toasts are announced via an `aria-live="polite"` region (sonner does this). Do not steal focus.

## Forms

- Label every field above the input. Placeholders are examples, never labels.
- Mark optional fields with "(optional)". Don't mark required ones with an asterisk.
- Helper text goes below the input in `text-muted`. Error text replaces it in `danger`, with a `CircleAlert` icon, linked via `aria-describedby`.
- Validate on blur and on submit, not on every keystroke (except type-to-confirm inputs).
- On submit with errors, focus the first invalid field and show an error summary at the top for forms with more than 3 fields.
- Save buttons say what they do ("Save settings"). Disable them while saving and show a spinner inside the button.
- If the user navigates away from a form with unsaved changes, ask "Discard unsaved changes?".
- Secrets (OAuth client secret) use a password input with a show/hide toggle, and once saved they are displayed only as `••••••••1a2b`.

## Responsive and input

- Every screen must work at 360 px wide and at 200% browser zoom without horizontal page scroll (tables may scroll inside their container).
- Touch targets are at least 24 × 24 px (WCAG 2.5.8), and 44 × 44 px recommended for primary actions.
- Hover is never the only way to reveal an action.

## Review checklist for UI PRs

- [ ] Only semantic tokens, no raw colours
- [ ] Light and dark screenshots attached
- [ ] Loading, empty, error and success states implemented
- [ ] Keyboard-only walkthrough done (see [accessibility](accessibility.md))
- [ ] Copy follows the [content style guide](content-style-guide.md)
- [ ] Works at 360 px and at 200% zoom
- [ ] No PII in console logs or error reports
