import { eq } from "drizzle-orm";
import type { z } from "zod";

import { StorageError, type Clock } from "@contact-fuse/core";

import type { Db } from "../client.ts";
import { settings } from "../schema.ts";

export interface SettingsRepository {
  get<T>(key: string, schema: z.ZodType<T>): T | undefined;
  set(key: string, value: unknown): void;
  delete(key: string): void;
}

export function createSettingsRepository(db: Db, clock: Clock): SettingsRepository {
  return {
    get(key, schema) {
      const row = db.select().from(settings).where(eq(settings.key, key)).get();
      if (!row) return undefined;
      const parsed = schema.safeParse(JSON.parse(row.valueJson));
      if (!parsed.success) {
        throw new StorageError("STORAGE_FAILED", "Stored setting is invalid", {
          details: { key },
        });
      }
      return parsed.data;
    },
    set(key, value) {
      const valueJson = JSON.stringify(value);
      const updatedAt = clock.now().toISOString();
      db.insert(settings)
        .values({ key, valueJson, updatedAt })
        .onConflictDoUpdate({ target: settings.key, set: { valueJson, updatedAt } })
        .run();
    },
    delete(key) {
      db.delete(settings).where(eq(settings.key, key)).run();
    },
  };
}
