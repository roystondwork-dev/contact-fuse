import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Persistence model. Column-level documentation: docs/architecture/data-model.md (authoritative).
 * Conventions: docs/standards/database.md. Never edit a released migration; generate a new one.
 */

export const ACCOUNT_STATUSES = ["connected", "needs-reauth", "disconnected"] as const;
export const SNAPSHOT_STATUSES = ["running", "completed", "failed"] as const;
export const CONTACT_SOURCES = ["contacts", "other-contacts"] as const;

const createdAt = () => text("created_at").notNull();
const updatedAt = () => text("updated_at").notNull();
const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    /** Stable account ID at the provider (Google `sub`). */
    providerAccountId: text("provider_account_id").notNull(),
    /** The user's own account email, shown in the UI. Never logged. */
    email: text("email").notNull(),
    displayName: text("display_name"),
    isMain: integer("is_main", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ACCOUNT_STATUSES }).notNull(),
    /** Space-separated OAuth scopes granted by the user. */
    grantedScopes: text("granted_scopes").notNull(),
    syncToken: text("sync_token"),
    lastSyncedAt: text("last_synced_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("accounts_provider_provider_account_id_key").on(t.provider, t.providerAccountId),
    // At most one main account.
    uniqueIndex("accounts_is_main_key")
      .on(t.isMain)
      .where(sql`${t.isMain} = 1`),
    check("accounts_status_check", sql`${t.status} IN (${inList(ACCOUNT_STATUSES)})`),
  ],
);

export const snapshots = sqliteTable(
  "snapshots",
  {
    id: text("id").primaryKey(),
    status: text("status", { enum: SNAPSHOT_STATUSES }).notNull(),
    contactCount: integer("contact_count").notNull().default(0),
    accountCount: integer("account_count").notNull().default(0),
    errorCode: text("error_code"),
    createdAt: createdAt(),
    completedAt: text("completed_at"),
  },
  (t) => [check("snapshots_status_check", sql`${t.status} IN (${inList(SNAPSHOT_STATUSES)})`)],
);

export const snapshotContacts = sqliteTable(
  "snapshot_contacts",
  {
    id: text("id").primaryKey(),
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => snapshots.id, { onDelete: "cascade" }),
    // Restrict: an account with backed-up contacts can be disconnected, but its row stays.
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    resourceId: text("resource_id").notNull(),
    etag: text("etag"),
    source: text("source", { enum: CONTACT_SOURCES }).notNull(),
    /** Canonical `Contact`, validated with Zod on read. */
    contactJson: text("contact_json").notNull(),
    /** Provider payload, kept for exact restore. */
    rawJson: text("raw_json").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("snapshot_contacts_snapshot_id_account_id_idx").on(t.snapshotId, t.accountId),
    uniqueIndex("snapshot_contacts_snapshot_id_account_id_resource_id_key").on(
      t.snapshotId,
      t.accountId,
      t.resourceId,
    ),
    check("snapshot_contacts_source_check", sql`${t.source} IN (${inList(CONTACT_SOURCES)})`),
  ],
);

/** Key/value settings; each value is JSON validated by its own Zod schema on read. */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: updatedAt(),
});
