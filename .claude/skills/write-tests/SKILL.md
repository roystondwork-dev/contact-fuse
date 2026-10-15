---
name: write-tests
description: Use when writing or updating tests for contact-fuse — unit tests (Vitest), provider HTTP tests (MSW), or end-to-end browser tests (Playwright) — or when fixing a bug (start with a failing test).
---

# Write tests

Full standard: [docs/standards/testing.md](../../../docs/standards/testing.md).

## Pick the right level

| What you're testing             | Tool                    | Location                       |
| ------------------------------- | ----------------------- | ------------------------------ |
| Pure logic in `packages/core`   | Vitest                  | `foo.test.ts` next to `foo.ts` |
| Server routes                   | Vitest + `app.inject()` | `apps/server/src/**/*.test.ts` |
| Provider HTTP (Google API etc.) | Vitest + MSW            | next to the provider module    |
| Full user flows in the browser  | Playwright              | `apps/web/e2e/*.spec.ts`       |

## Steps

1. **Bug fix?** Write a test that reproduces the bug and **watch it fail** before fixing it.
2. **Name tests as behaviour:** `it("merges phones when rule is union")`, grouped with `describe("<unit>")`.
3. **Use synthetic data only**, such as "Test Person", `test.person@example.com`, and numbers from
   reserved or fictional ranges. **Never real contacts.** Reuse shared fixture builders
   (e.g. `makeContact({...})`) instead of large inline objects.
4. **Arrange, act, assert.** One behaviour per test. Prefer `it.each` for tables of inputs.
5. **Cover edge cases:** empty and missing fields, Unicode and non-Latin names, international and
   local phone formats, duplicate values, very large inputs.
6. **Never hit the network.** Mock Google HTTP with MSW. Unhandled requests must fail the test.
7. **Keep tests deterministic:** inject clocks and ID generators, and avoid snapshot tests for logic.
8. Run `pnpm test` (or `pnpm test:watch`) and check coverage targets: core ≥ 90%, server and providers ≥ 75% lines.

## Must not

- Test private implementation details
- Use real tokens, accounts or contact data
- Leave `.only` or `.skip` in committed code
