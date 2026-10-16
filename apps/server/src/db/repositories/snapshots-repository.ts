import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { StorageError, type Clock, type ProviderContact } from "@contact-fuse/core";

import type { Db } from "../client.ts";
import { parseContactJson } from "../contact-json.ts";
import { accounts, snapshotContacts, snapshots } from "../schema.ts";

export type SnapshotRow = typeof snapshots.$inferSelect;

export interface SnapshotAccountCount {
  accountId: string;
  email: string;
  contactCount: number;
}

export interface SnapshotsRepository {
  findRunning(): SnapshotRow | undefined;
  insertRunning(id: string): SnapshotRow;
  findById(id: string): SnapshotRow | undefined;
  listNewestFirst(): SnapshotRow[];
  accountCounts(snapshotIds: string[]): Map<string, SnapshotAccountCount[]>;
  /** Stores one account's contacts atomically. */
  insertContacts(input: {
    snapshotId: string;
    accountId: string;
    contacts: ProviderContact[];
    nextId: () => string;
  }): void;
  complete(id: string, counts: { contactCount: number; accountCount: number }): void;
  fail(id: string, errorCode: string): void;
  failAllRunning(errorCode: string): number;
  iterateContacts(snapshotId: string): Generator<{
    accountEmail: string;
    contact: NonNullable<ReturnType<typeof parseContactJson>>;
  }>;
  delete(id: string): boolean;
  /** Deletes completed snapshots beyond the newest `keep`; returns how many were removed. */
  pruneCompleted(keep: number): number;
  deleteAll(): void;
}

export function createSnapshotsRepository(db: Db, clock: Clock): SnapshotsRepository {
  const now = () => clock.now().toISOString();
  const find = (id: string) => db.select().from(snapshots).where(eq(snapshots.id, id)).get();

  return {
    findRunning: () => db.select().from(snapshots).where(eq(snapshots.status, "running")).get(),
    insertRunning(id) {
      db.insert(snapshots).values({ id, status: "running", createdAt: now() }).run();
      const row = find(id);
      if (!row) throw new StorageError("STORAGE_FAILED", "Snapshot row missing after insert");
      return row;
    },
    findById: find,
    listNewestFirst: () =>
      db.select().from(snapshots).orderBy(desc(snapshots.createdAt), desc(snapshots.id)).all(),

    accountCounts(snapshotIds) {
      const result = new Map<string, SnapshotAccountCount[]>();
      if (snapshotIds.length === 0) return result;
      const rows = db
        .select({
          snapshotId: snapshotContacts.snapshotId,
          accountId: snapshotContacts.accountId,
          email: accounts.email,
          contactCount: sql<number>`count(*)`,
        })
        .from(snapshotContacts)
        .innerJoin(accounts, eq(accounts.id, snapshotContacts.accountId))
        .where(inArray(snapshotContacts.snapshotId, snapshotIds))
        .groupBy(snapshotContacts.snapshotId, snapshotContacts.accountId)
        .orderBy(accounts.createdAt)
        .all();
      for (const { snapshotId, ...count } of rows) {
        result.set(snapshotId, [...(result.get(snapshotId) ?? []), count]);
      }
      return result;
    },

    insertContacts({ snapshotId, accountId, contacts, nextId }) {
      const createdAt = now();
      db.transaction((tx) => {
        for (const item of contacts) {
          tx.insert(snapshotContacts)
            .values({
              id: nextId(),
              snapshotId,
              accountId,
              resourceId: item.contact.ref.resourceId,
              etag: item.contact.ref.version ?? null,
              source: item.source,
              contactJson: JSON.stringify(item.contact),
              rawJson: JSON.stringify(item.raw),
              createdAt,
            })
            .run();
        }
      });
    },

    complete(id, counts) {
      db.update(snapshots)
        .set({ status: "completed", ...counts, completedAt: now() })
        .where(eq(snapshots.id, id))
        .run();
    },
    fail(id, errorCode) {
      db.update(snapshots)
        .set({ status: "failed", errorCode, completedAt: now() })
        .where(eq(snapshots.id, id))
        .run();
    },
    failAllRunning(errorCode) {
      return db
        .update(snapshots)
        .set({ status: "failed", errorCode, completedAt: now() })
        .where(eq(snapshots.status, "running"))
        .run().changes;
    },

    *iterateContacts(snapshotId) {
      const statement = db.$client.prepare(
        `SELECT a.email AS accountEmail, sc.contact_json AS contactJson
         FROM snapshot_contacts sc JOIN accounts a ON a.id = sc.account_id
         WHERE sc.snapshot_id = ? ORDER BY a.created_at, sc.rowid`,
      );
      // Iterate row by row: large address books are never loaded fully into memory.
      for (const row of statement.iterate(snapshotId) as Iterable<{
        accountEmail: string;
        contactJson: string;
      }>) {
        const contact = parseContactJson(row.contactJson);
        if (!contact) throw new StorageError("STORAGE_FAILED", "Stored contact is invalid");
        yield { accountEmail: row.accountEmail, contact };
      }
    },

    delete: (id) => db.delete(snapshots).where(eq(snapshots.id, id)).run().changes > 0,

    pruneCompleted(keep) {
      const stale = db
        .select({ id: snapshots.id })
        .from(snapshots)
        .where(eq(snapshots.status, "completed"))
        .orderBy(desc(snapshots.createdAt), desc(snapshots.id))
        .all()
        .slice(keep)
        .map((row) => row.id);
      if (stale.length === 0) return 0;
      return db
        .delete(snapshots)
        .where(and(eq(snapshots.status, "completed"), inArray(snapshots.id, stale)))
        .run().changes;
    },

    deleteAll() {
      db.delete(snapshots).run();
    },
  };
}
