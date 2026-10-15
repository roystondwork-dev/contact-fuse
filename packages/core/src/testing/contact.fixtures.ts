import type { Contact } from "../model/contact.ts";
import type { AccountId } from "../model/ids.ts";

/** Synthetic data only. Never put real names, emails or numbers here (docs/standards/testing.md#5). */
export const TEST_ACCOUNT_ID = "acc_test_1" as AccountId;

let sequence = 0;

export function buildContact(overrides: Partial<Contact> = {}): Contact {
  sequence += 1;
  return {
    ref: { accountId: TEST_ACCOUNT_ID, resourceId: `people/c${sequence}` },
    displayName: `Test Person ${sequence}`,
    emails: [],
    phones: [],
    groups: [],
    ...overrides,
  };
}

/** A fixed clock for deterministic tests. */
export function fixedClock(iso = "2026-01-01T00:00:00.000Z"): { now(): Date } {
  const date = new Date(iso);
  return { now: () => new Date(date) };
}

/** Sequential IDs (`test_1`, `test_2`, ...) for deterministic tests. */
export function sequentialIds(prefix = "test"): { next(): string } {
  let n = 0;
  return { next: () => `${prefix}_${++n}` };
}
