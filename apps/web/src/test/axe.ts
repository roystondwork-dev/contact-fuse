import axe from "axe-core";
import { expect } from "vitest";

/**
 * Run axe-core (WCAG 2.x A/AA rules) against a rendered container. Colour contrast can't be
 * computed in jsdom; tokens are pre-verified in docs/design/design-system.md and the Playwright
 * e2e scan covers it in a real browser.
 */
export async function expectNoA11yViolations(container: Element = document.body): Promise<void> {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  const summary = results.violations.map(
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(" | ")}`,
  );
  expect(summary).toEqual([]);
}
