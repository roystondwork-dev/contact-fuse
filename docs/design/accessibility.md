# Accessibility

contact-fuse targets **WCAG 2.2 level AA** for every screen. Accessibility is part of the [definition of done](../process/definition-of-done.md), not a follow-up task. Colour contrast values are verified in the [design system](design-system.md#verified-contrast-ratios).

## WCAG 2.2 AA checklist

Use this list when reviewing UI pull requests. The numbers refer to WCAG success criteria.

### Perceivable

- [ ] **1.1.1 Non-text content:** meaningful icons have an accessible name, decorative icons have `aria-hidden="true"`.
- [ ] **1.3.1 Info and relationships:** semantic HTML (`<main>`, `<nav>`, `<h1>`–`<h3>` in order, `<table>` with `<th scope>`, `<label for>`).
- [ ] **1.3.2 Meaningful sequence:** DOM order matches visual order.
- [ ] **1.3.5 Identify input purpose:** `autocomplete` attributes where they apply.
- [ ] **1.4.1 Use of colour:** confidence, status, diffs and errors use an icon and/or text as well as colour.
- [ ] **1.4.3 Contrast (minimum):** text ≥ 4.5:1, large text ≥ 3:1 (use the tokens; they are pre-verified).
- [ ] **1.4.4 Resize text:** usable at 200% browser zoom.
- [ ] **1.4.10 Reflow:** no horizontal page scroll at 320 CSS px (data tables may scroll within their container).
- [ ] **1.4.11 Non-text contrast:** control boundaries and focus indicators ≥ 3:1 (`input-border`, `focus-ring`).
- [ ] **1.4.12 Text spacing:** no clipping when line/letter/word spacing is increased.
- [ ] **1.4.13 Content on hover/focus:** tooltips are dismissible (Esc), hoverable and persistent.

### Operable

- [ ] **2.1.1 Keyboard:** everything works with the keyboard alone.
- [ ] **2.1.2 No keyboard trap:** except intentional dialog focus traps, which close with Esc.
- [ ] **2.1.4 Character key shortcuts:** single-key shortcuts only work when focus is in the relevant list and can be turned off in settings.
- [ ] **2.2.1 Timing adjustable:** toasts with actions stay at least 8 s and pause on hover/focus. Errors persist.
- [ ] **2.3.1 Three flashes:** no flashing content.
- [ ] **2.4.1 Bypass blocks:** "Skip to main content" link is the first focusable element.
- [ ] **2.4.2 Page titled:** `<title>` is "Page – contact-fuse" and updates on route change.
- [ ] **2.4.3 Focus order:** logical. After route change, focus moves to the page H1.
- [ ] **2.4.6 Headings and labels:** descriptive.
- [ ] **2.4.7 Focus visible:** 2 px `focus-ring` outline with a 2 px offset on every interactive element (`focus-visible:`).
- [ ] **2.4.11 Focus not obscured (minimum):** sticky headers and toasts never fully cover the focused element.
- [ ] **2.5.3 Label in name:** the accessible name contains the visible label.
- [ ] **2.5.7 Dragging movements:** any drag interaction (e.g. moving a contact between clusters) has a non-drag alternative (a menu).
- [ ] **2.5.8 Target size (minimum):** targets ≥ 24 × 24 px or adequately spaced.

### Understandable

- [ ] **3.1.1 Language of page:** `<html lang="en">`.
- [ ] **3.2.1 / 3.2.2 On focus / on input:** no unexpected context changes. Settings apply on Save.
- [ ] **3.2.6 Consistent help:** the "Help" link sits in the same place on every page.
- [ ] **3.3.1 Error identification:** errors are described in text and linked to the field.
- [ ] **3.3.2 Labels or instructions:** every input has a visible label.
- [ ] **3.3.3 Error suggestion:** errors say how to fix the problem.
- [ ] **3.3.4 Error prevention (legal, financial, data):** destructive writes are reversible (undo), previewed (dry run) and confirmed.
- [ ] **3.3.7 Redundant entry:** don't make users re-type information they've already given.
- [ ] **3.3.8 Accessible authentication (minimum):** Google sign-in happens in Google's own page. Pasting the client ID and secret is allowed (never block paste).

### Robust

- [ ] **4.1.2 Name, role, value:** custom widgets use Radix primitives or correct ARIA.
- [ ] **4.1.3 Status messages:** progress, toasts and "N results" updates are announced via `aria-live` without moving focus.

## Keyboard map

### Global

| Keys                | Action                                        |
| ------------------- | --------------------------------------------- |
| `Tab` / `Shift+Tab` | Next / previous focusable element             |
| `Enter` / `Space`   | Activate button, toggle checkbox/switch       |
| `Esc`               | Close dialog, sheet, popover, tooltip or menu |
| `/`                 | Focus the search/filter field on list pages   |
| `?`                 | Open the keyboard shortcuts dialog            |

### Cluster review (focus inside the cluster list)

| Keys                   | Action                   |
| ---------------------- | ------------------------ |
| `↑` / `↓` or `k` / `j` | Previous / next cluster  |
| `Enter`                | Open cluster detail      |
| `a`                    | Approve focused cluster  |
| `r`                    | Reject focused cluster   |
| `x`                    | Toggle selection         |
| `Shift+A`              | Approve all selected     |
| `u`                    | Undo last approve/reject |

Single-letter shortcuts are **only** active when focus is in the cluster list (not in inputs) and can be disabled under _Settings → Accessibility_. They are listed in the `?` dialog.

### Tables

Arrow keys move between rows when a row is focused (roving `tabindex`), and `Space` toggles row selection.

## Focus management

- **Route change:** move focus to the page `<h1>` (with `tabIndex={-1}`) and announce the new page title.
- **Dialog open:** focus goes to the first meaningful control. For destructive dialogs that is **Cancel**, and for type-to-confirm dialogs it is the input.
- **Dialog close:** return focus to the element that opened it.
- **Item removed from a list** (e.g. a cluster approved and hidden): move focus to the next item, or to the previous one if it was the last, or to the empty-state heading.
- **Errors on submit:** focus the first invalid field (or the error summary for long forms).
- Never remove the outline without replacing it. Use `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring`.

## Screen readers

- Landmarks: one `<header>`, `<nav aria-label="Main">`, `<main id="main">`, and `<footer>` if present.
- Confidence badges read as "High confidence, score 92" via visually hidden text, not just "High".
- Diff lines include visually hidden "added" / "removed" / "changed from … to …" text.
- Progress uses `<Progress>` (role `progressbar` with `aria-valuenow`), plus a polite live region that announces stage changes at most every 5 seconds. Do not announce every increment.
- Counts that update after filtering ("24 clusters") live in a polite live region.
- Avoid `aria-label` on non-interactive `div`s. Prefer visible text.
- Test with **VoiceOver** on macOS (`⌘ F5` toggles it; use Safari), and with **NVDA** on Windows (Firefox or Chrome) when possible.

## Reduced motion and other preferences

- Respect `prefers-reduced-motion` (see [motion](design-system.md#motion)).
- Respect `prefers-color-scheme`, and provide a manual override.
- Support Windows High Contrast / `forced-colors: active`: icons use `currentColor`, focus outlines use `outline` (not `box-shadow`) so they remain visible, and badges keep a border.

## Testing

### Automated

1. **Component and unit level:** `vitest-axe` (`expect(await axe(container)).toHaveNoViolations()`) for every shared component in `components/ui` and every feature component that renders a form, dialog or table.
2. **End to end:** `@axe-core/playwright` in `apps/web/e2e/`. Every page is scanned in **both** light and dark mode with the WCAG 2.2 AA tags:

```ts
// apps/web/e2e/a11y.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/welcome", "/accounts", "/backups", "/scans/latest", "/runs", "/settings"];

for (const theme of ["light", "dark"] as const) {
  for (const path of PAGES) {
    test(`${path} has no WCAG 2.2 AA violations in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
}
```

3. **Keyboard e2e:** at least one Playwright test per main flow is driven only by `page.keyboard` (connect is mocked → scan → approve cluster → dry run).

Automated tools catch roughly a third of issues, so manual checks are required too.

### Manual (for every UI PR)

- [ ] Complete the changed flow using only the keyboard. Focus is always visible and in a logical order.
- [ ] Zoom to 200% and resize to 320 px wide. Nothing important is lost.
- [ ] Check light and dark mode.
- [ ] Turn on "Reduce motion" in macOS System Settings → Accessibility → Display and check behaviour.
- [ ] Quick VoiceOver pass over new components: names, roles and states are announced correctly.

### Release audit (M4)

A full manual audit against the checklist above. Results are recorded in an issue labelled `a11y-audit`, and all AA failures must be fixed before v1.0.
