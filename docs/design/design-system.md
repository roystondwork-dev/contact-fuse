# Design system

The visual foundation of the contact-fuse UI: colour, type, spacing, shape, elevation, motion and icons. Rules for applying these to screens live in the [UI guidelines](ui-guidelines.md). Accessibility requirements are in [accessibility](accessibility.md).

**Brand idea: "fuse".** Two things becoming one. The primary colour sits between indigo (trust, calm) and violet (distinctive). The interface is quiet and neutral so that **the user's data and the decisions about it** stand out.

## Principles

1. **Semantic tokens only in components.** Write `bg-primary`, `text-muted`, `border-border`, never `bg-indigo-600` or `#5B45E6`. Raw scales exist only to define tokens.
2. **Light and dark are equal citizens.** Every token has a light and a dark value. The default follows `prefers-color-scheme`, with a manual toggle (System / Light / Dark).
3. **Never colour alone.** Confidence, status and destructive meaning always pair colour with an icon and a text label.
4. **Offline and private.** No remote fonts, icon CDNs or images. Everything ships in the bundle.
5. **WCAG 2.2 AA minimum.** Every text/background pair below has a computed contrast ratio.

---

## Colour

### Primary scale ("Fuse", indigo-violet)

| Step | Hex       | Typical use                       |
| ---- | --------- | --------------------------------- |
| 50   | `#F2F1FF` | Selected row background (light)   |
| 100  | `#E6E4FF` | Subtle primary background (light) |
| 200  | `#CFCBFF` | Hover on subtle backgrounds       |
| 300  | `#ADA6FF` | Focus ring (dark)                 |
| 400  | `#8B7FFB` | **Primary (dark mode)**           |
| 500  | `#6D5DF3` | Focus ring (light)                |
| 600  | `#5B45E6` | **Primary (light mode)**          |
| 700  | `#4B36CB` | Primary hover (light)             |
| 800  | `#3E2EA4` | Primary active (light)            |
| 900  | `#352B82` | Subtle primary background (dark)  |
| 950  | `#201A4C` | Selected row background (dark)    |

### Neutral scale (cool grey, slightly violet-tinted)

| Step | Hex       | Typical use                           |
| ---- | --------- | ------------------------------------- |
| 0    | `#FFFFFF` | Surface (light)                       |
| 50   | `#F8F8FB` | Surface muted (light)                 |
| 100  | `#F1F1F5` | Text (dark), `badge-neutral` (light)  |
| 200  | `#E4E4EB` | Border (light)                        |
| 300  | `#D0D0DA` | Disabled border (light)               |
| 400  | `#A0A0AF` | Text muted (dark)                     |
| 500  | `#8A8A99` | Input border (light)                  |
| 600  | `#565664` | Text muted (light)                    |
| 700  | `#6B6B7B` | Input border (dark)                   |
| 800  | `#2A2A34` | Border (dark), `badge-neutral` (dark) |
| 900  | `#1A1A22` | Text (light), surface muted (dark)    |
| 950  | `#101016` | Surface (dark)                        |

> Neutral 700 is intentionally lighter than a strict ramp would give, so the dark-mode input border passes the 3:1 non-text contrast requirement.

### Status colours

| Role    | Light     | Light subtle bg | Dark      | Dark subtle bg |
| ------- | --------- | --------------- | --------- | -------------- |
| Success | `#15803D` | `#ECFDF3`       | `#4ADE80` | `#0B2A18`      |
| Warning | `#B45309` | `#FFFBEB`       | `#FBBF24` | `#2E2106`      |
| Danger  | `#B91C1C` | `#FEF2F2`       | `#F87171` | `#2F1212`      |
| Info    | `#0369A1` | `#EFF8FF`       | `#38BDF8` | `#0B2233`      |

### Semantic tokens

These are the **only** colour names components may use.

| Token                        | Light                 | Dark                  | Use                                     |
| ---------------------------- | --------------------- | --------------------- | --------------------------------------- |
| `primary`                    | `#5B45E6`             | `#8B7FFB`             | Primary buttons, links, selected state  |
| `primary-hover`              | `#4B36CB`             | `#ADA6FF`             | Hover on primary                        |
| `primary-foreground`         | `#FFFFFF`             | `#101016`             | Text/icons on `primary`                 |
| `primary-subtle`             | `#F2F1FF`             | `#201A4C`             | Selected rows, active nav item          |
| `surface`                    | `#FFFFFF`             | `#101016`             | Page and card background                |
| `surface-muted`              | `#F8F8FB`             | `#1A1A22`             | Sidebar, table header, secondary panels |
| `surface-raised`             | `#FFFFFF`             | `#1A1A22`             | Dialogs, popovers (paired with shadow)  |
| `border`                     | `#E4E4EB`             | `#2A2A34`             | Decorative dividers, card outlines      |
| `input-border`               | `#8A8A99`             | `#6B6B7B`             | Form controls (must meet 3:1)           |
| `text`                       | `#1A1A22`             | `#F1F1F5`             | Body text, headings                     |
| `text-muted`                 | `#565664`             | `#A0A0AF`             | Secondary text, captions, placeholders  |
| `success` / `success-subtle` | `#15803D` / `#ECFDF3` | `#4ADE80` / `#0B2A18` | Completed, High confidence              |
| `warning` / `warning-subtle` | `#B45309` / `#FFFBEB` | `#FBBF24` / `#2E2106` | Needs attention, Medium confidence      |
| `danger` / `danger-subtle`   | `#B91C1C` / `#FEF2F2` | `#F87171` / `#2F1212` | Destructive actions, errors             |
| `danger-foreground`          | `#FFFFFF`             | `#101016`             | Text on `danger` buttons                |
| `info` / `info-subtle`       | `#0369A1` / `#EFF8FF` | `#38BDF8` / `#0B2233` | Neutral notices, tips                   |
| `badge-neutral`              | `#F1F1F5`             | `#2A2A34`             | Low-confidence and neutral badges       |
| `focus-ring`                 | `#6D5DF3`             | `#ADA6FF`             | 2px focus outline                       |

### Confidence colours

| Confidence     | Colour token | Background                                                                    | Icon (lucide)  | Label    |
| -------------- | ------------ | ----------------------------------------------------------------------------- | -------------- | -------- |
| High (≥ 85)    | `success`    | `success-subtle`                                                              | `ShieldCheck`  | "High"   |
| Medium (60–84) | `warning`    | `warning-subtle`                                                              | `CircleHelp`   | "Medium" |
| Low (< 60)     | `text-muted` | `badge-neutral`: neutral-100 `#F1F1F5` (light) / neutral-800 `#2A2A34` (dark) | `CircleDashed` | "Low"    |

Badges always show **icon + label**, and optionally the score: `[ShieldCheck] High · 92`.

### Verified contrast ratios

Computed with the WCAG 2.x relative-luminance formula. AA requires **4.5:1** for normal text, **3:1** for large text (≥ 24px, or ≥ 18.66px bold) and **3:1** for UI component boundaries and focus indicators.

| Pair (foreground on background)                  | Light | Dark  | Requirement | Result |
| ------------------------------------------------ | ----- | ----- | ----------- | ------ |
| `text` on `surface`                              | 17.29 | 16.83 | 4.5         | ✅ AAA |
| `text` on `surface-muted`                        | 16.31 | 15.35 | 4.5         | ✅ AAA |
| `text-muted` on `surface`                        | 7.21  | 7.35  | 4.5         | ✅ AAA |
| `text-muted` on `surface-muted`                  | 6.81  | 6.70  | 4.5         | ✅ AA  |
| `primary-foreground` on `primary`                | 6.11  | 5.89  | 4.5         | ✅ AA  |
| `primary` (link text) on `surface`               | 6.11  | 5.89  | 4.5         | ✅ AA  |
| `primary` on `primary-subtle`                    | 5.47  | 4.97  | 4.5         | ✅ AA  |
| `text` on `primary-subtle`                       | 15.48 | 14.19 | 4.5         | ✅ AAA |
| `primary-foreground` on `primary-hover`          | 7.81  | 8.73  | 4.5         | ✅ AAA |
| `success` on `surface`                           | 5.02  | 10.88 | 4.5         | ✅ AA  |
| `success` on `success-subtle`                    | 4.76  | 8.87  | 4.5         | ✅ AA  |
| `warning` on `surface`                           | 5.02  | 11.36 | 4.5         | ✅ AA  |
| `warning` on `warning-subtle`                    | 4.84  | 9.41  | 4.5         | ✅ AA  |
| `danger` on `surface`                            | 6.47  | 6.85  | 4.5         | ✅ AA  |
| `danger` on `danger-subtle`                      | 5.91  | 6.24  | 4.5         | ✅ AA  |
| `danger-foreground` on `danger`                  | 6.47  | 6.85  | 4.5         | ✅ AA  |
| `info` on `surface`                              | 5.93  | 8.85  | 4.5         | ✅ AA  |
| `info` on `info-subtle`                          | 5.52  | 7.59  | 4.5         | ✅ AA  |
| Low badge text (`text-muted`) on `badge-neutral` | 6.40  | 5.50  | 4.5         | ✅ AA  |
| `input-border` on `surface`                      | 3.40  | 3.62  | 3.0         | ✅     |
| `input-border` on `surface-muted`                | 3.21  | 3.30  | 3.0         | ✅     |
| `focus-ring` on `surface`                        | 4.66  | 8.73  | 3.0         | ✅     |

`border` (`#E4E4EB` / `#2A2A34`) is **decorative only** and must never be the sole boundary of an interactive control. Use `input-border` for that.

> Rejected during verification: light `danger` `#DC2626` on `#FEF2F2` gave only 4.41:1, so danger was darkened to `#B91C1C`. Dark input border `#5E5E6E` gave 2.98:1, so it was replaced with `#6B6B7B`.
>
> If you change a colour, recompute **every** row it appears in and update this table in the same PR.

### Tailwind v4 theme

Lives in `apps/web/src/styles/theme.css` and is imported from `index.css` after `@import "tailwindcss";`.

```css
/* apps/web/src/styles/theme.css */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* 1. Semantic values: light (default) */
:root {
  --cf-primary: #5b45e6;
  --cf-primary-hover: #4b36cb;
  --cf-primary-foreground: #ffffff;
  --cf-primary-subtle: #f2f1ff;
  --cf-surface: #ffffff;
  --cf-surface-muted: #f8f8fb;
  --cf-surface-raised: #ffffff;
  --cf-border: #e4e4eb;
  --cf-input-border: #8a8a99;
  --cf-text: #1a1a22;
  --cf-text-muted: #565664;
  --cf-success: #15803d;
  --cf-success-subtle: #ecfdf3;
  --cf-warning: #b45309;
  --cf-warning-subtle: #fffbeb;
  --cf-danger: #b91c1c;
  --cf-danger-subtle: #fef2f2;
  --cf-danger-foreground: #ffffff;
  --cf-info: #0369a1;
  --cf-info-subtle: #eff8ff;
  --cf-badge-neutral: #f1f1f5;
  --cf-focus-ring: #6d5df3;
  color-scheme: light;
}

/* 2. Dark values: explicit choice, or system preference when no explicit light choice */
[data-theme="dark"] {
  --cf-primary: #8b7ffb;
  --cf-primary-hover: #ada6ff;
  --cf-primary-foreground: #101016;
  --cf-primary-subtle: #201a4c;
  --cf-surface: #101016;
  --cf-surface-muted: #1a1a22;
  --cf-surface-raised: #1a1a22;
  --cf-border: #2a2a34;
  --cf-input-border: #6b6b7b;
  --cf-text: #f1f1f5;
  --cf-text-muted: #a0a0af;
  --cf-success: #4ade80;
  --cf-success-subtle: #0b2a18;
  --cf-warning: #fbbf24;
  --cf-warning-subtle: #2e2106;
  --cf-danger: #f87171;
  --cf-danger-subtle: #2f1212;
  --cf-danger-foreground: #101016;
  --cf-info: #38bdf8;
  --cf-info-subtle: #0b2233;
  --cf-badge-neutral: #2a2a34;
  --cf-focus-ring: #ada6ff;
  color-scheme: dark;
}

/* 2b. Before theme-init.js runs (or if scripts fail), follow the system preference. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* same values as [data-theme="dark"] above */
  }
}

/* 3. Expose as Tailwind utilities: bg-primary, text-text-muted, border-input-border, ... */
@theme inline {
  --color-primary: var(--cf-primary);
  --color-primary-hover: var(--cf-primary-hover);
  --color-primary-foreground: var(--cf-primary-foreground);
  --color-primary-subtle: var(--cf-primary-subtle);
  --color-surface: var(--cf-surface);
  --color-surface-muted: var(--cf-surface-muted);
  --color-surface-raised: var(--cf-surface-raised);
  --color-border: var(--cf-border);
  --color-input-border: var(--cf-input-border);
  --color-text: var(--cf-text);
  --color-text-muted: var(--cf-text-muted);
  --color-success: var(--cf-success);
  --color-success-subtle: var(--cf-success-subtle);
  --color-warning: var(--cf-warning);
  --color-warning-subtle: var(--cf-warning-subtle);
  --color-danger: var(--cf-danger);
  --color-danger-subtle: var(--cf-danger-subtle);
  --color-danger-foreground: var(--cf-danger-foreground);
  --color-info: var(--cf-info);
  --color-info-subtle: var(--cf-info-subtle);
  --color-badge-neutral: var(--cf-badge-neutral);
  --color-focus-ring: var(--cf-focus-ring);
}

/* 4. Non-colour tokens */
@theme {
  --font-sans:
    ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans",
    Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  --font-mono:
    ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

  --radius-sm: 4px;
  --radius-md: 8px; /* default */
  --radius-lg: 12px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px 0 rgb(16 16 22 / 0.06);
  --shadow-md: 0 4px 12px -2px rgb(16 16 22 / 0.1), 0 2px 4px -2px rgb(16 16 22 / 0.06);
  --shadow-lg: 0 12px 32px -4px rgb(16 16 22 / 0.18), 0 4px 8px -4px rgb(16 16 22 / 0.08);

  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-exit: cubic-bezier(0.3, 0, 1, 1);
}

body {
  background-color: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-sans);
}
```

The theme toggle sets `data-theme` on `<html>` to `light` or `dark`. With "System", a small script sets it from `matchMedia("(prefers-color-scheme: dark)")` before first paint and the app listens for changes, which avoids a flash of the wrong theme. The script is a separate file (`apps/web/public/theme-init.js`, loaded from `index.html`), not inline, because the Content Security Policy forbids inline scripts. As a fallback, `theme.css` also applies the dark values under `@media (prefers-color-scheme: dark)` while `data-theme` is not `light`. The preference is stored in `localStorage` (`contact-fuse:theme`); every read and write is wrapped in `try`/`catch` because storage can be blocked.

---

## Typography

System font stack only (see `--font-sans` above). Sizes use Tailwind's rem-based scale, so they respect the user's browser font size.

| Role            | Tailwind                | Size / line height | Weight  | Use                           |
| --------------- | ----------------------- | ------------------ | ------- | ----------------------------- |
| Display         | `text-3xl`              | 30 / 36 px         | 600     | Onboarding headline only      |
| H1 (page title) | `text-2xl`              | 24 / 32 px         | 600     | One per page                  |
| H2 (section)    | `text-xl`               | 20 / 28 px         | 600     | Page sections                 |
| H3 (card title) | `text-base`             | 16 / 24 px         | 600     | Cards, dialogs                |
| Body            | `text-sm`               | 14 / 20 px         | 400     | Default UI text               |
| Body large      | `text-base`             | 16 / 24 px         | 400     | Onboarding, long explanations |
| Caption         | `text-xs`               | 12 / 16 px         | 400–500 | Metadata, badges, table meta  |
| Mono            | `font-mono text-[13px]` | 13 / 20 px         | 400     | Phone numbers in diffs, IDs   |

Rules:

- Use `tabular-nums` for counts, scores and any numbers that line up in columns.
- Use sentence case for all headings and buttons (see [content style guide](content-style-guide.md)).
- Keep line length at most about 75 characters for prose (`max-w-prose`).
- Use at most two weights per screen region (400 and 600).

## Spacing

4 px base (Tailwind's default `--spacing: 0.25rem`).

| Token | px  | Typical use                                |
| ----- | --- | ------------------------------------------ |
| `1`   | 4   | Icon-to-label gap in badges                |
| `2`   | 8   | Inline gaps, compact padding               |
| `3`   | 12  | Input padding-x, list item gap             |
| `4`   | 16  | Card padding (compact), mobile page gutter |
| `6`   | 24  | Card padding, section gap                  |
| `8`   | 32  | Between page sections                      |
| `12`  | 48  | Page top padding on large screens          |

Use only the steps in this table. Arbitrary values (`p-[13px]`) need a review comment explaining why.

## Radius

| Token          | px   | Use                                 |
| -------------- | ---- | ----------------------------------- |
| `rounded-sm`   | 4    | Badges, checkboxes                  |
| `rounded-md`   | 8    | **Default**: buttons, inputs, cards |
| `rounded-lg`   | 12   | Dialogs, large panels               |
| `rounded-full` | 9999 | Avatars, pills, toggles             |

## Elevation

| Level | Token           | Use                             |
| ----- | --------------- | ------------------------------- |
| 0     | none + `border` | Cards, tables (flat by default) |
| 1     | `shadow-sm`     | Sticky headers, hovered cards   |
| 2     | `shadow-md`     | Popovers, dropdowns, toasts     |
| 3     | `shadow-lg`     | Dialogs                         |

In dark mode, shadows are barely visible, so raised layers also use `surface-raised` plus a `border`.

## Motion

| Token    | Duration | Easing          | Use                    |
| -------- | -------- | --------------- | ---------------------- |
| Instant  | 100 ms   | `ease-standard` | Hover, press, checkbox |
| Quick    | 150 ms   | `ease-standard` | Dropdowns, tooltips    |
| Standard | 200 ms   | `ease-standard` | Dialog and sheet enter |
| Exit     | 150 ms   | `ease-exit`     | Dialog and sheet exit  |
| Progress | linear   | n/a             | Progress bars          |

Rules:

- Animate only `opacity` and `transform`.
- Respect `prefers-reduced-motion: reduce`. Use Tailwind's `motion-safe:` and `motion-reduce:` variants, replace movement with an opacity change, and never auto-play looping animations.
- No motion purely for decoration, especially during runs.

## Iconography

- Library: **lucide-react**, imported per icon (`import { ShieldCheck } from "lucide-react"`) so the bundle stays tree-shaken.
- Sizes: 16 px inline with `text-sm`, 20 px in buttons and nav, 24 px in empty states (the empty-state illustration may be 48 px).
- Stroke width: default (2). `currentColor` only, never a hard-coded colour.
- Decorative icons get `aria-hidden="true"`. Icon-only buttons need an `aria-label`.

| Concept           | Icon              |
| ----------------- | ----------------- |
| Account           | `CircleUserRound` |
| Main account      | `Star`            |
| Snapshot / backup | `Archive`         |
| Scan              | `ScanSearch`      |
| Cluster           | `Combine`         |
| Merge / apply     | `Merge`           |
| Dry run           | `Eye`             |
| Undo              | `Undo2`           |
| Settings          | `Settings`        |
| Delete            | `Trash2`          |
| Export            | `Download`        |
| Privacy           | `Lock`            |
| Error             | `CircleAlert`     |
| Warning           | `TriangleAlert`   |
| Success           | `CircleCheck`     |
| Info              | `Info`            |

## Breakpoints

Tailwind defaults, designed mobile-first. The primary target is a laptop browser, but every screen must work down to 360 px wide.

| Name   | Min width | Layout behaviour                                       |
| ------ | --------- | ------------------------------------------------------ |
| (base) | 0         | Single column, top bar with menu button, 16 px gutters |
| `sm`   | 640 px    | Wider forms, two-column account cards                  |
| `md`   | 768 px    | Cluster compare shows 2 contacts side by side          |
| `lg`   | 1024 px   | Persistent sidebar navigation                          |
| `xl`   | 1280 px   | Cluster list and detail as two panes                   |
| `2xl`  | 1536 px   | Content max width 1280 px, centred                     |

## Change process

Design token changes are code changes:

1. Update this document **and** `theme.css` in the same PR.
2. Recompute the contrast table for every affected pair.
3. Attach light and dark screenshots of affected screens to the PR.
