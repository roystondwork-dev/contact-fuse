import { and, asc, eq } from "drizzle-orm";

import { StorageError, type AccountId, type Clock } from "@contact-fuse/core";

import type { Db } from "../client.ts";
import { accounts } from "../schema.ts";

export type AccountRow = typeof accounts.$inferSelect;

export interface ConnectedAccountInput {
  id: AccountId;
  provider: "google";
  providerAccountId: string;
  email: string;
  grantedScopes: string[];
}

export interface AccountsRepository {
  list(): AccountRow[];
  findById(id: string): AccountRow | undefined;
  findByProviderAccount(provider: string, providerAccountId: string): AccountRow | undefined;
  insertConnected(input: ConnectedAccountInput): AccountRow;
  markReconnected(
    id: string,
    input: Pick<ConnectedAccountInput, "email" | "grantedScopes">,
  ): AccountRow;
  setStatus(id: string, status: AccountRow["status"]): void;
  deleteAll(): void;
}

export function createAccountsRepository(db: Db, clock: Clock): AccountsRepository {
  const now = () => clock.now().toISOString();
  const mustFind = (id: string): AccountRow => {
    const row = db.select().from(accounts).where(eq(accounts.id, id)).get();
    if (!row) throw new StorageError("STORAGE_FAILED", "Account row missing after write");
    return row;
  };

  return {
    list: () => db.select().from(accounts).orderBy(asc(accounts.createdAt), asc(accounts.id)).all(),
    findById: (id) => db.select().from(accounts).where(eq(accounts.id, id)).get(),
    findByProviderAccount: (provider, providerAccountId) =>
      db
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)),
        )
        .get(),
    insertConnected(input) {
      const timestamp = now();
      db.insert(accounts)
        .values({
          id: input.id,
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          email: input.email,
          status: "connected",
          grantedScopes: input.grantedScopes.join(" "),
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
      return mustFind(input.id);
    },
    markReconnected(id, input) {
      db.update(accounts)
        .set({
          email: input.email,
          status: "connected",
          grantedScopes: input.grantedScopes.join(" "),
          updatedAt: now(),
        })
        .where(eq(accounts.id, id))
        .run();
      return mustFind(id);
    },
    setStatus(id, status) {
      db.update(accounts)
        .set({ status, updatedAt: now(), ...(status === "disconnected" ? { isMain: false } : {}) })
        .where(eq(accounts.id, id))
        .run();
    },
    deleteAll() {
      db.delete(accounts).run();
    },
  };
}
