---
name: ui-component
description: Use when building or changing a React UI component or screen in apps/web — enforces contact-fuse design tokens, shadcn/ui usage, accessibility, light/dark mode, loading/empty/error states and copy style.
---

# Build a UI component

Read first: [design system](../../../docs/design/design-system.md) ·
[UI guidelines](../../../docs/design/ui-guidelines.md) ·
[accessibility](../../../docs/design/accessibility.md) ·
[content style guide](../../../docs/design/content-style-guide.md)

## Steps

1. **Reuse before you build.** Check existing components in `apps/web/src`, then shadcn/ui
   primitives. Add a shadcn component with its CLI rather than writing one from scratch.
2. **File and naming:** kebab-case file (`merge-review-card.tsx`), PascalCase named export
   (`export function MergeReviewCard`), and props type `MergeReviewCardProps`. No default exports.
3. **Styling:** Tailwind classes using **semantic tokens only** (`bg-surface`, `text-muted`,
   `border-border`, `text-danger`). No raw hex values, no Tailwind palette colours (`bg-indigo-500`) and no
   inline styles. Spacing uses the 4px scale. The default radius is 8px.
4. **Icons:** `lucide-react`, sized with tokens. Decorative icons get `aria-hidden`.
5. **Meaning is never colour-only:** confidence (High, Medium, Low) and destructive actions always
   pair colour with an icon **and** a text label.
6. **States:** handle loading (skeletons), empty, error (with a retry action) and success. Server data comes
   through TanStack Query hooks, not `useEffect` fetches.
7. **Destructive actions** (delete, cleanup policy `delete`, apply a run) need a confirmation dialog that
   states exactly what will happen and that it can be undone.
8. **Accessibility:** semantic HTML first, labelled controls, full keyboard support, visible focus
   ring, WCAG 2.2 AA contrast, and live regions for async status.
9. **Copy:** sentence case, plain words, glossary terms (main account, snapshot, cluster…).
10. **Verify** in light and dark mode at mobile (360px) and desktop widths. Use synthetic data in any
    screenshots.
11. Add tests: interaction logic with Vitest, critical flows with Playwright (skill: `write-tests`).
