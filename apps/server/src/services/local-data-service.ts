import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

import type { FastifyBaseLogger } from "fastify";

import { ConflictError } from "@contact-fuse/core";

import { SECRET_KEYS, type SecretStore } from "../auth/secret-store.ts";
import type { AccountsRepository } from "../db/repositories/accounts-repository.ts";
import type { SettingsRepository } from "../db/repositories/settings-repository.ts";
import type { SnapshotsRepository } from "../db/repositories/snapshots-repository.ts";
import type { AccountService } from "./account-service.ts";
import type { GoogleClientService } from "./google-client-service.ts";
import type { SnapshotService } from "./snapshot-service.ts";

const SETTINGS_KEYS = ["google.oauthClient"] as const;

export interface LocalDataService {
  /** "Delete all local data": tokens, secrets, backups, accounts, settings, logs, DB backups. */
  deleteAll(): Promise<void>;
}

export function createLocalDataService(deps: {
  dataDir?: string;
  accountsRepository: AccountsRepository;
  snapshots: SnapshotsRepository;
  settings: SettingsRepository;
  secrets: SecretStore;
  accountService: AccountService;
  googleClient: GoogleClientService;
  snapshotService: SnapshotService;
  log: FastifyBaseLogger;
}): LocalDataService {
  return {
    async deleteAll() {
      if (deps.snapshotService.isRunning()) {
        throw new ConflictError("RUN_IN_PROGRESS", "Wait for the backup to finish first");
      }
      const accounts = deps.accountsRepository.list();
      // Revoke at Google first (best effort, inside disconnect), then remove every local trace.
      for (const account of accounts) {
        if (account.status !== "disconnected") await deps.accountService.disconnect(account.id);
        await deps.secrets.delete(SECRET_KEYS.refreshToken(account.id));
      }
      await deps.googleClient.remove();
      deps.snapshots.deleteAll();
      deps.accountsRepository.deleteAll();
      for (const key of SETTINGS_KEYS) deps.settings.delete(key);

      if (deps.dataDir) await deleteSideFiles(deps.dataDir);
      deps.log.info({ accountCount: accounts.length }, "all local data deleted");
    },
  };
}

/** Pre-migration DB backups and log files. The live database file itself stays (now empty). */
async function deleteSideFiles(dataDir: string): Promise<void> {
  const entries = await readdir(dataDir).catch(() => []);
  for (const name of entries) {
    if (name.startsWith("contact-fuse.sqlite.bak-")) await rm(join(dataDir, name), { force: true });
  }
  await rm(join(dataDir, "logs"), { recursive: true, force: true });
}
