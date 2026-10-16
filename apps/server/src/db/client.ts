import { chmodSync, copyFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { StorageError } from "@contact-fuse/core";

import * as schema from "./schema.ts";

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

/** Resolves to src/db/migrations in development and dist/migrations in the bundled build. */
const DEFAULT_MIGRATIONS_DIR = fileURLToPath(new URL("./migrations", import.meta.url));

export interface OpenDatabaseOptions {
  /** File path, or ":memory:" for tests. */
  path: string;
  migrationsDir?: string;
  /** Used to name the pre-migration backup file. */
  now?: () => Date;
}

export interface OpenDatabaseResult {
  db: Db;
  /** Path of the file backup taken before applying migrations, if one was needed. */
  backupPath?: string;
}

export function openDatabase(options: OpenDatabaseOptions): OpenDatabaseResult {
  const migrationsDir = options.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;
  const isFile = options.path !== ":memory:";
  const existedBefore = isFile && existsSync(options.path);

  try {
    const client = new Database(options.path);
    if (isFile) chmodSync(options.path, 0o600);
    client.pragma("journal_mode = WAL");
    client.pragma("foreign_keys = ON");
    client.pragma("busy_timeout = 5000");
    client.pragma("synchronous = NORMAL");

    let backupPath: string | undefined;
    if (existedBefore && hasPendingMigrations(client, migrationsDir)) {
      const stamp = (options.now?.() ?? new Date()).toISOString().replace(/[:.]/g, "-");
      backupPath = `${options.path}.bak-${stamp}`;
      client.pragma("wal_checkpoint(TRUNCATE)");
      copyFileSync(options.path, backupPath);
      chmodSync(backupPath, 0o600);
    }

    const db = drizzle({ client, schema });
    migrate(db, { migrationsFolder: migrationsDir });
    return { db, ...(backupPath ? { backupPath } : {}) };
  } catch (error) {
    throw new StorageError("STORAGE_FAILED", "Could not open or migrate the database", {
      cause: error,
    });
  }
}

function hasPendingMigrations(client: Database.Database, migrationsDir: string): boolean {
  const journal = JSON.parse(readFileSync(`${migrationsDir}/meta/_journal.json`, "utf8")) as {
    entries: unknown[];
  };
  const table = client
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'",
    )
    .get();
  if (!table) return journal.entries.length > 0;
  const row = client.prepare("SELECT count(*) AS n FROM __drizzle_migrations").get() as {
    n: number;
  };
  return row.n < journal.entries.length;
}
