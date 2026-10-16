import type { Account, Snapshot } from "../lib/api-types.ts";

// Synthetic data only (example.com addresses, fixed dates).

export function buildAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-1",
    provider: "google",
    email: "person.one@example.com",
    isMain: false,
    status: "connected",
    includesOtherContacts: false,
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
    ...overrides,
  };
}

export function buildSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    id: "snap-1",
    status: "completed",
    contactCount: 42,
    accountCount: 1,
    createdAt: "2026-10-02T10:00:00.000Z",
    completedAt: "2026-10-02T10:01:00.000Z",
    accounts: [{ accountId: "acc-1", email: "person.one@example.com", contactCount: 42 }],
    ...overrides,
  };
}

export const CSRF_TOKEN = "test-csrf-token";
export const VALID_CLIENT_ID = "1234-test.apps.googleusercontent.com";
export const CLIENT_SECRET = "synthetic-secret-value-1a2b";
