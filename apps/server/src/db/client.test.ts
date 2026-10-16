import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { openDatabase } from "./client.ts";
import { accounts } from "./schema.ts";

const MIGRATIONS_DIR = fileURLToPath(new URL("./migrations", import.meta.url));
const NOW = "2026-01-01T00:00:00.000Z";
const tempDirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "contact-fuse-test-"));
  tempDirs.push(dir);
  return dir;
}

function insertAccount(db: ReturnType<typeof openDatabase>["db"], id: string, isMain: boolean) {
  db.insert(accounts)
    .values({
      id,
      provider: "google",
      providerAccountId: `sub-${id}`,
      email: `${id}@example.com`,
      isMain,
      status: "connected",
      grantedScopes: "openid",
      createdAt: NOW,
      updatedAt: NOW,
    })
    .run();
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("openDatabase", () => {
  it("applies all migrations to an empty in-memory database", () => {
    const { db, backupPath } = openDatabase({ path: ":memory:" });
    const tables = db.$client
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toEqual(
      expect.arrayContaining(["accounts", "settings", "snapshot_contacts", "snapshots"]),
    );
    expect(backupPath).toBeUndefined();
  });

  it("enforces foreign keys and status checks", () => {
    const { db } = openDatabase({ path: ":memory:" });
    expect(() =>
      db.$client
        .prepare(
          "INSERT INTO accounts (id, provider, provider_account_id, email, status, granted_scopes, created_at, updated_at) VALUES ('a', 'google', 's', 'a@example.com', 'bogus', '', 'x', 'x')",
        )
        .run(),
    ).toThrow(/CHECK constraint/);
    expect(() =>
      db.$client
        .prepare(
          "INSERT INTO snapshot_contacts (id, snapshot_id, account_id, resource_id, source, contact_json, raw_json, created_at) VALUES ('c', 'missing', 'missing', 'people/c1', 'contacts', '{}', '{}', 'x')",
        )
        .run(),
    ).toThrow(/FOREIGN KEY/);
  });

  it("allows at most one main account", () => {
    const { db } = openDatabase({ path: ":memory:" });
    insertAccount(db, "acc_1", true);
    insertAccount(db, "acc_2", false);
    expect(() => insertAccount(db, "acc_3", true)).toThrow(/UNIQUE/);
  });

  it("creates the file with owner-only permissions", () => {
    const path = join(tempDir(), "contact-fuse.sqlite");
    openDatabase({ path }).db.$client.close();
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it("backs up an existing file before applying pending migrations, and not otherwise", () => {
    const dir = tempDir();
    const path = join(dir, "contact-fuse.sqlite");
    const now = () => new Date(NOW);

    // "Previous release": only the migrations that exist today.
    const oldMigrations = join(dir, "migrations-old");
    cpSync(MIGRATIONS_DIR, oldMigrations, { recursive: true });
    const first = openDatabase({ path, now, migrationsDir: oldMigrations });
    expect(first.backupPath).toBeUndefined(); // brand-new file: nothing to back up
    first.db.$client.close();

    // "New release": one extra migration.
    const newMigrations = join(dir, "migrations-new");
    cpSync(oldMigrations, newMigrations, { recursive: true });
    writeFileSync(join(newMigrations, "9999_extra.sql"), "CREATE TABLE `extra` (`id` text);");
    const journalPath = join(newMigrations, "meta", "_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      entries: { idx: number; when: number; tag: string; version: string; breakpoints: boolean }[];
    };
    const last = journal.entries.at(-1);
    if (!last) throw new Error("journal has no entries");
    journal.entries.push({ ...last, idx: last.idx + 1, when: last.when + 1, tag: "9999_extra" });
    writeFileSync(journalPath, JSON.stringify(journal));

    const upgraded = openDatabase({ path, now, migrationsDir: newMigrations });
    expect(upgraded.backupPath).toBe(`${path}.bak-2026-01-01T00-00-00-000Z`);
    expect(statSync(upgraded.backupPath ?? "").mode & 0o777).toBe(0o600);
    upgraded.db.$client.close();

    // Up to date now: no second backup.
    const again = openDatabase({ path, now, migrationsDir: newMigrations });
    expect(again.backupPath).toBeUndefined();
    again.db.$client.close();
    expect(readdirSync(dir).filter((name) => name.includes(".bak-"))).toHaveLength(1);
  });
});
