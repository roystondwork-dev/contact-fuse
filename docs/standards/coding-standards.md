# Coding Standards

This document defines how TypeScript code is written in contact-fuse. Every rule exists because contact-fuse deletes and rewrites real people's address books: the code must be predictable, type-safe, and easy to review. Rules marked **(lint)** are enforced by ESLint/Prettier/TypeScript in CI; the rest are enforced in [code review](../process/code-review.md).

## Contents

1. [Principles](#1-principles)
2. [Formatting](#2-formatting)
3. [TypeScript](#3-typescript)
4. [Modules and imports](#4-modules-and-imports)
5. [Functions](#5-functions)
6. [Data and immutability](#6-data-and-immutability)
7. [Async code](#7-async-code)
8. [Package boundaries](#8-package-boundaries)
9. [Server (Fastify)](#9-server-fastify)
10. [Web (React)](#10-web-react)
11. [Comments](#11-comments)
12. [Security-sensitive code](#12-security-sensitive-code)

Related: [naming-conventions.md](naming-conventions.md) · [testing.md](testing.md) · [error-handling-and-logging.md](error-handling-and-logging.md) · [api-design.md](api-design.md)

---

## 1. Principles

1. **Safety over cleverness.** A boring, obvious implementation beats a clever one. Reviewers must be able to convince themselves that no contact is lost.
2. **Make illegal states unrepresentable.** Prefer types that cannot hold invalid data (discriminated unions, branded IDs) over runtime checks scattered through the code.
3. **Pure core, impure edges.** Logic lives in `@contact-fuse/core` as pure functions; I/O (HTTP, DB, keychain, clock) lives at the edges and is injected.
4. **Validate at boundaries, trust inside.** Anything from outside the process (HTTP bodies, Google responses, DB rows, env vars, files) is parsed with Zod once. Inside, types are trusted.
5. **No PII leaves the function that needs it.** Not into logs, not into error messages, not into telemetry (there is none).

## 2. Formatting

Formatting is not up for debate — Prettier decides. **(lint)**

| Setting         | Value                   |
| --------------- | ----------------------- |
| Indent          | 2 spaces (EditorConfig) |
| Line endings    | LF                      |
| Print width     | 100                     |
| Quotes          | double                  |
| Semicolons      | always                  |
| Trailing commas | all                     |

Run `pnpm format` before committing; CI runs `pnpm format:check`.

## 3. TypeScript

### 3.1 Compiler settings

`tsconfig.base.json` enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` and `verbatimModuleSyntax`. Packages extend it; **never loosen these per package**. **(lint)**

### 3.2 No `any`

`any` disables the type checker. Use `unknown` and narrow it. **(lint: `@typescript-eslint/no-explicit-any`)**

```ts
// ❌
function parse(body: any) {
  return body.accounts;
}

// ✅
function parse(body: unknown): Account[] {
  return AccountListSchema.parse(body).accounts;
}
```

If a third-party type is genuinely wrong, wrap it in one adapter function with a `// eslint-disable-next-line` and a comment explaining why.

### 3.3 No non-null assertions or unchecked casts in logic

`x!` and `x as Foo` lie to the compiler. Allowed only where the invariant is local and obvious (e.g. `document.getElementById("root")!` at app bootstrap).

```ts
// ❌
const main = accounts.find((a) => a.isMain)!;

// ✅
const main = accounts.find((a) => a.isMain);
if (!main) throw new NoMainAccountError();
```

### 3.4 Types for data, unions for variants

- Use `interface` for object shapes that may be extended; `type` for unions, mapped and utility types.
- Model variants as **discriminated unions** with a `kind` field and handle them with exhaustive `switch` + `assertNever`.

```ts
type MergeOperation =
  | { kind: "create"; accountId: AccountId; contact: Contact }
  | { kind: "update"; ref: ContactRef; patch: ContactPatch }
  | { kind: "delete"; ref: ContactRef }
  | { kind: "label"; ref: ContactRef; label: string };

function describe(op: MergeOperation): string {
  switch (op.kind) {
    case "create":
      return "create";
    case "update":
      return "update";
    case "delete":
      return "delete";
    case "label":
      return "label";
    default:
      return assertNever(op); // compile error if a variant is added
  }
}
```

### 3.5 No TypeScript `enum`

Use `as const` objects plus a derived union. Enums generate runtime code, do not tree-shake well, and behave oddly with `verbatimModuleSyntax`.

```ts
// ❌
enum Confidence {
  High,
  Medium,
  Low,
}

// ✅
export const CONFIDENCE = { HIGH: "high", MEDIUM: "medium", LOW: "low" } as const;
export type Confidence = (typeof CONFIDENCE)[keyof typeof CONFIDENCE];
```

### 3.6 Branded IDs

IDs of different entities must not be interchangeable.

```ts
export type AccountId = string & { readonly __brand: "AccountId" };
export type SnapshotId = string & { readonly __brand: "SnapshotId" };
```

### 3.7 Explicit return types on exported functions

Exported functions declare their return type. It documents the contract and keeps errors near the cause. Local helpers and callbacks may rely on inference.

## 4. Modules and imports

- **ESM only.** No `require`, no CommonJS output. **(lint)**
- **Named exports only.** Default exports are allowed only where a tool requires them (`vite.config.ts`, `tsdown.config.ts`, `eslint.config.js`, `drizzle.config.ts`). Named exports make renames and grep reliable.
- **Type-only imports use `import type`.** Required by `verbatimModuleSyntax`. **(lint)**
- **Relative imports include the extension** (`./normalize.ts`) inside Node packages, matching NodeNext resolution.
- **Each package has one public entry point** (`src/index.ts`). Other packages import only from `@contact-fuse/<pkg>`, never from `@contact-fuse/<pkg>/src/...`.
- **No barrel files inside a package** other than `index.ts`. Intermediate `index.ts` files hide cycles and slow tooling.
- Import order: Node built-ins → external packages → `@contact-fuse/*` → relative. Separate groups with a blank line.

## 5. Functions

- **Small and single-purpose.** If a function needs a comment block to explain its sections, split it.
- **Max 3 positional parameters.** Beyond that, take an options object.

```ts
// ❌
scoreMatch(a, b, true, 0.85, "IN");

// ✅
scoreMatch(a, b, { fuzzyNames: true, threshold: 85, defaultRegion: "IN" });
```

- **No boolean flag parameters** that switch behaviour; write two functions or use a union option.
- **Inject dependencies** (clock, ID generator, provider client, DB) via parameters or a context object, never import a singleton inside core logic. This keeps code deterministic and testable (see [testing.md](testing.md#6-determinism)).
- **Early return** over nested `if`/`else`.

## 6. Data and immutability

- Prefer `const`; `let` only when reassignment is required; never `var`. **(lint)**
- Do not mutate arguments. Core functions return new objects.
- Mark public data structures `readonly` (`readonly Contact[]`, `Readonly<MergeRules>`).
- Use `Map`/`Set` for keyed lookups, not plain objects indexed by user data (avoids `__proto__` pitfalls).
- Use ISO-8601 strings (UTC) for timestamps crossing a boundary (API, DB). Use `Date` only inside a function.

## 7. Async code

- `async`/`await` only; no `.then()` chains in new code (except in tiny React effects).
- **No floating promises.** Every promise is awaited, returned, or explicitly `void`-ed with a reason. **(lint: `no-floating-promises`)**
- **Bound concurrency** when calling Google: use a shared limiter (e.g. `p-limit`) configured from the provider's rate limits. Never `Promise.all` over an unbounded list of network calls.
- Long operations accept an `AbortSignal` so a run can be cancelled cleanly.
- Retry only idempotent calls, with exponential backoff + jitter, and only on retryable errors (429, 5xx, network). See [error-handling-and-logging.md](error-handling-and-logging.md).

## 8. Package boundaries

| Package                    | May import                                                    | Must not                                                             |
| -------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `@contact-fuse/core`       | nothing but small pure libs (e.g. `libphonenumber-js`, `zod`) | Node APIs (`fs`, `http`), DB, providers, React, clock/random globals |
| `@contact-fuse/provider-*` | `core`                                                        | server, web, DB                                                      |
| `apps/server`              | `core`, `provider-*`                                          | `web`                                                                |
| `apps/web`                 | `core` **types only**                                         | server code, providers, Node APIs                                    |

Rationale: the matching and merge logic is the heart of the product; keeping it pure lets us test it exhaustively and reuse it with any provider. Boundary violations are blocked in review and will be enforced by an ESLint import rule.

## 9. Server (Fastify)

- One **plugin per resource** (`routes/accounts.ts`, `routes/merge-plans.ts`) registered with a `/api/v1` prefix.
- Every route declares Zod schemas for `params`, `querystring`, `body` and `response`.
- Route handlers stay thin: parse → call a service → map result. Business logic lives in services (`src/services/`) or `core`.
- Never bind to anything but `127.0.0.1`. See [security-and-privacy.md](../architecture/security-and-privacy.md).
- Configuration is read once at startup from `CONTACT_FUSE_*` env vars, validated with Zod, and passed down. No `process.env` reads elsewhere.

## 10. Web (React)

- **Function components and hooks only.** No class components.
- **Server state lives in TanStack Query**; local UI state in `useState`/`useReducer`. No global store until there is a proven need.
- **One component per file**; the file name is the kebab-case component name (`merge-review-card.tsx` exports `MergeReviewCard`).
- **Props are a named type** `<Component>Props` declared above the component.
- **Styling uses Tailwind utilities with semantic tokens** (`bg-surface`, `text-danger`), never raw hex values or palette shades in components. See [design-system.md](../design/design-system.md).
- **Build on shadcn/ui primitives** in `src/components/ui/`; do not reimplement dialogs, menus or focus management.
- **Every destructive action** (delete, apply, cleanup) goes through a confirmation dialog that states counts and is undoable. See [ui-guidelines.md](../design/ui-guidelines.md).
- Accessibility is required, not optional — see [accessibility.md](../design/accessibility.md).

```tsx
// ✅
type ConfidenceBadgeProps = { confidence: Confidence };

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return <Badge variant={confidence}>{CONFIDENCE_LABEL[confidence]}</Badge>;
}
```

## 11. Comments

- Comment **why**, not what. The code says what.
- Public exports of `core` and providers have TSDoc (see [documentation.md](documentation.md#4-code-documentation-tsdoc)).
- `TODO` comments must reference an issue: `// TODO(#123): handle contact photos`. Bare TODOs fail review.
- Never commit commented-out code.

## 12. Security-sensitive code

Changes to any of these areas need a second reviewer and a note in the PR description:

- OAuth flow, token storage, keychain access
- Anything that issues `delete`/`update` calls to a provider
- Merge plan execution and undo
- Logging configuration and redaction
- Server binding, CORS, CSRF/Origin checks

Never log, print, or include in an error message: tokens, client secrets, or contact PII. See [error-handling-and-logging.md](error-handling-and-logging.md#5-pii-and-secret-redaction).
