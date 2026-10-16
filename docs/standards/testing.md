# Testing

contact-fuse modifies people's real address books, so tests are the main way we prove that no contact is lost, merged wrongly, or leaked. This document explains what to test, where, how, and the coverage bar a PR must meet.

Related: [coding-standards.md](coding-standards.md) · [definition-of-done.md](../process/definition-of-done.md) · [ci-cd.md](../process/ci-cd.md) · [matching-engine.md](../architecture/matching-engine.md) · [merge-engine.md](../architecture/merge-engine.md)

## Contents

1. [Tools](#1-tools)
2. [Test pyramid](#2-test-pyramid)
3. [What to test where](#3-what-to-test-where)
4. [Coverage requirements](#4-coverage-requirements)
5. [Test data: synthetic only](#5-test-data-synthetic-only)
6. [Determinism](#6-determinism)
7. [Mocking HTTP with MSW](#7-mocking-http-with-msw)
8. [Writing good tests](#8-writing-good-tests)
9. [Snapshot tests](#9-snapshot-tests)
10. [End-to-end tests](#10-end-to-end-tests)
11. [Running tests](#11-running-tests)

---

## 1. Tools

| Tool                              | Purpose                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| **Vitest**                        | unit and integration tests across all packages (root `vitest.config.ts` with projects) |
| **MSW** (Mock Service Worker)     | intercepts HTTP to the Google People API and OAuth endpoints in Node tests             |
| **Fastify `inject`**              | in-process HTTP tests for server routes — no real port                                 |
| **In-memory SQLite** (`:memory:`) | DB integration tests with real migrations applied                                      |
| **React Testing Library**         | component tests in `apps/web` (jsdom)                                                  |
| **Playwright**                    | end-to-end tests of critical user flows in a real browser                              |

## 2. Test pyramid

```
           ▲  E2E (Playwright)            few — critical flows only
          ▲▲▲ Integration (routes + DB + MSW)   some — every route, every provider call
       ▲▲▲▲▲▲▲ Unit (pure core logic)      many — every rule, every edge case
```

- **Unit**: pure functions, no I/O. Fast (< 10 ms each). The bulk of the suite.
- **Integration**: a slice of the real system — Fastify route + service + in-memory DB + MSW-mocked Google.
- **E2E**: the built app in Chromium against a mocked provider. Slow; reserve for the flows users cannot afford to have broken.

## 3. What to test where

| Package                    | Must test                                                                                                                                                                                                                                                     | Style                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `packages/core`            | normalisation (phones, emails, names), match scoring and reasons, clustering, confidence thresholds, every merge rule strategy (`prefer-main`, `newest`, `most-complete`, `union`), merge plan generation, exclusions, cleanup policies, undo plan generation | unit, table-driven, property-style where useful |
| `packages/provider-google` | mapping Google `Person` ⇄ `Contact` (round trip), pagination and sync tokens, batching limits, etag conflict handling, retry on 429/5xx, error mapping to `ContactFuseError`                                                                                  | integration with MSW                            |
| `apps/server`              | every route: validation (400), happy path, error shape; snapshot creation; run execution writes audit log; undo; idempotency keys; server binds only to `127.0.0.1`                                                                                           | Fastify `inject` + in-memory DB + MSW           |
| `apps/server` db           | migrations apply on empty DB; repositories round-trip                                                                                                                                                                                                         | integration                                     |
| `apps/web`                 | components with logic (review card decisions, rule editor), hooks, confirmation dialogs                                                                                                                                                                       | React Testing Library                           |
| `apps/web/e2e`             | critical flows (see §10)                                                                                                                                                                                                                                      | Playwright                                      |

**Rule:** a bug fix must ship with a test that fails without the fix.

## 4. Coverage requirements

Measured with Vitest's V8 coverage, enforced in CI.

| Package               | Line coverage                               | Branch coverage |
| --------------------- | ------------------------------------------- | --------------- |
| `packages/core`       | **≥ 90%**                                   | ≥ 85%           |
| `packages/provider-*` | **≥ 75%**                                   | ≥ 70%           |
| `apps/server`         | **≥ 75%**                                   | ≥ 70%           |
| `apps/web`            | no hard gate; critical flows covered by e2e | —               |

Coverage is a floor, not a goal. 100% coverage with weak assertions is worse than 85% with precise ones. Never add tests only to move the number.

## 5. Test data: synthetic only

**Never commit real contact data** — not yours, not a friend's, not "anonymised" exports. Real data in a public repo is a privacy breach and cannot be fully removed from git history.

- Use builders in `*.fixtures.ts` files. Each builder returns a valid object with sensible defaults; tests override only what matters.

```ts
// packages/core/src/testing/contact.fixtures.ts
let sequence = 0;

export function buildContact(overrides: Partial<Contact> = {}): Contact {
  sequence += 1;
  return {
    ref: { accountId: "acc_test_1" as AccountId, resourceId: `people/c${sequence}` },
    displayName: `Test Person ${sequence}`,
    emails: [],
    phones: [],
    groups: [],
    ...overrides,
  };
}
```

```ts
// ✅ the test shows only what matters
const a = buildContact({ phones: [{ value: "+91 98765 43210" }] });
const b = buildContact({ phones: [{ value: "098765 43210" }] });
expect(scoreMatch(a, b, opts).score).toBeGreaterThanOrEqual(85);
```

- Use obviously fake values: names like `Test Person 3`, `Asha Example`; emails at `example.com`/`example.org` (RFC 2606); phone numbers from reserved/fictional ranges (e.g. `+1 555-01xx`, or clearly patterned numbers like `+91 90000 000xx`).
- Builders live in a `testing/` folder per package and are exported from a separate entry (`@contact-fuse/core/testing`), never from the main entry.

## 6. Determinism

A test that sometimes fails is worse than no test. Tests must not depend on:

| Source of flakiness    | Rule                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| Wall clock             | Inject a `Clock` (`{ now(): Date }`); use a fixed clock in tests. In rare cases use `vi.useFakeTimers()`.   |
| Random / IDs           | Inject an ID generator; tests use a sequential fake.                                                        |
| Network                | No real network. MSW runs with `onUnhandledFrame: "error"` so any unmocked call fails the test.           |
| File system / keychain | Use temp dirs (`fs.mkdtemp`) and an in-memory keychain fake. Never touch the real data dir.                 |
| Order                  | Tests must pass in any order and in parallel. No shared mutable state between tests; reset in `beforeEach`. |
| Locale / timezone      | CI runs with `TZ=UTC`; code under test receives region/locale explicitly.                                   |

```ts
// ❌
const plan = buildMergePlan(clusters, rules); // reads Date.now() internally

// ✅
const plan = buildMergePlan(clusters, rules, { clock: fixedClock("2026-01-01T00:00:00Z") });
```

## 7. Mocking HTTP with MSW

- Handlers for Google endpoints live in `packages/provider-google/src/testing/handlers.ts` and model realistic responses, including pagination (`nextPageToken`), `etag`, and error bodies.
- Each test starts from default handlers and overrides only what it exercises:

```ts
server.use(
  http.post("https://people.googleapis.com/v1/people:batchUpdateContacts", () =>
    HttpResponse.json({ error: { code: 429, status: "RESOURCE_EXHAUSTED" } }, { status: 429 }),
  ),
);
```

- Assert on **what was sent** for write operations (request bodies, batch sizes ≤ provider limits), not only on the result. Writes to Google are the riskiest part of the system.

## 8. Writing good tests

- **Name**: `describe("<unit>")` + `it("<does X> when <Y>")`. Read together they form a sentence.
  - ✅ `it("keeps the main account's name when rule is prefer-main")`
  - ❌ `it("works")`, `it("test 2")`
- **Arrange / Act / Assert**, separated by blank lines. One behaviour per test.
- **Table-driven tests** (`it.each`) for normalisation and scoring cases.
- **Assert precisely**: `toEqual` on the exact expected value, not `toBeTruthy`.
- **Test behaviour, not implementation**: assert on outputs and effects, not on private helpers or call order (except for provider writes, see §7).
- **Safety invariants get dedicated tests**, e.g.:
  - a merge plan never contains `delete` when cleanup policy is `keep`;
  - every value from every cluster member appears in the survivor or in the audit log;
  - undoing a run restores the exact pre-run snapshot state;
  - no operation targets a contact matched by an exclusion.

## 9. Snapshot tests

Allowed only for **stable, reviewed, serialized output**: vCard/CSV export format, OpenAPI schema output, and merge plan summaries. Rules:

- Use inline snapshots (`toMatchInlineSnapshot`) when under ~20 lines so the reviewer sees them.
- Never snapshot React component trees or large objects "just to have a test".
- Updating a snapshot (`-u`) must be explained in the PR description.

## 10. End-to-end tests

Playwright tests live in `apps/web/e2e/*.spec.ts` and run against the built app with the Google provider mocked at the network layer. Required flows:

1. Connect two accounts (mocked OAuth) and choose a main account.
2. Snapshot is taken and can be exported.
3. Scan shows clusters grouped by confidence.
4. Approve/reject clusters, edit a survivor field.
5. Dry run shows the merge plan with correct counts.
6. Apply the run; confirmation dialog requires explicit confirmation.
7. Undo the run.

E2E tests must use accessible locators (`getByRole`, `getByLabel`), which doubles as an accessibility check.

## 11. Running tests

```bash
pnpm test                 # all unit + integration tests once
pnpm test:watch           # watch mode
pnpm vitest run packages/core          # one package
pnpm vitest run -t "union"             # tests whose name matches
pnpm vitest run --coverage             # with coverage report (coverage/)
pnpm --filter @contact-fuse/web e2e    # Playwright e2e (after build)
pnpm check                # format + lint + typecheck + test — run before every PR
```
