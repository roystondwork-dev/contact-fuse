import { describe, expect, it } from "vitest";

import { buildAccount } from "../../test/fixtures.ts";
import { findConnectedAccount } from "./use-connect-flow.ts";

function baselineOf(...accounts: ReturnType<typeof buildAccount>[]) {
  return Object.fromEntries(
    accounts.map((account) => [
      account.id,
      JSON.stringify([
        account.status,
        account.includesOtherContacts,
        account.email,
        account.displayName ?? null,
        account.lastSyncedAt ?? null,
        account.updatedAt,
      ]),
    ]),
  );
}

describe("findConnectedAccount", () => {
  it("detects a newly added account", () => {
    const before = buildAccount();
    const added = buildAccount({ id: "acc-2", email: "person.two@example.com" });
    expect(findConnectedAccount(baselineOf(before), [before, added])?.id).toBe("acc-2");
  });

  it("detects a reconnect of an already-connected account through updatedAt", () => {
    const before = buildAccount();
    const after = { ...before, updatedAt: "2026-10-01T09:05:00.000Z" };
    expect(findConnectedAccount(baselineOf(before), [after])?.id).toBe("acc-1");
  });

  it("ignores accounts that did not change", () => {
    const before = buildAccount();
    expect(findConnectedAccount(baselineOf(before), [before])).toBeUndefined();
  });
});
