import type { FastifyBaseLogger } from "fastify";
import type { OAuth2Client } from "google-auth-library";

import {
  AuthError,
  ConflictError,
  NotFoundError,
  isContactFuseError,
  type AccountId,
  type ContactProvider,
  type IdGenerator,
} from "@contact-fuse/core";
import { createGoogleProvider } from "@contact-fuse/provider-google";

import type { AccountsRepository } from "../db/repositories/accounts-repository.ts";
import type { SnapshotRow, SnapshotsRepository } from "../db/repositories/snapshots-repository.ts";
import type { AccountService } from "./account-service.ts";

/** Default retention (docs/architecture/security-and-privacy.md#retention-and-deletion). */
export const SNAPSHOTS_TO_KEEP = 10;

/** API shape (docs/architecture/http-api.md#snapshots-backups). */
export interface SnapshotDto {
  id: string;
  status: SnapshotRow["status"];
  contactCount: number;
  accountCount: number;
  errorCode?: string;
  createdAt: string;
  completedAt?: string;
  accounts: { accountId: string; email: string; contactCount: number }[];
  progress?: { fetched: number };
}

export type ProviderFactory = (options: {
  auth: OAuth2Client;
  accountId: AccountId;
}) => ContactProvider;

export interface SnapshotService {
  /** Starts a backup of every connected account in the background. */
  start(): SnapshotDto;
  list(): SnapshotDto[];
  get(id: string): SnapshotDto;
  requireCompleted(id: string): SnapshotRow;
  delete(id: string): void;
  isRunning(): boolean;
  /** Resolves when the background job (if any) has finished. For tests and shutdown. */
  idle(): Promise<void>;
}

export function createSnapshotService(deps: {
  snapshots: SnapshotsRepository;
  accountsRepository: AccountsRepository;
  accountService: AccountService;
  ids: IdGenerator;
  log: FastifyBaseLogger;
  createProvider?: ProviderFactory;
}): SnapshotService {
  const { snapshots, accountsRepository, accountService, ids, log } = deps;
  const createProvider = deps.createProvider ?? createGoogleProvider;
  const progress = new Map<string, number>();
  let running: Promise<void> = Promise.resolve();

  // A snapshot left "running" by a crash or quit can never finish: mark it failed.
  const interrupted = snapshots.failAllRunning("INTERNAL_ERROR");
  if (interrupted > 0) log.warn({ count: interrupted }, "marked interrupted snapshots as failed");

  const toDtos = (rows: SnapshotRow[]): SnapshotDto[] => {
    const counts = snapshots.accountCounts(rows.map((row) => row.id));
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      contactCount: row.contactCount,
      accountCount: row.accountCount,
      ...(row.errorCode ? { errorCode: row.errorCode } : {}),
      createdAt: row.createdAt,
      ...(row.completedAt ? { completedAt: row.completedAt } : {}),
      accounts: counts.get(row.id) ?? [],
      ...(row.status === "running" ? { progress: { fetched: progress.get(row.id) ?? 0 } } : {}),
    }));
  };

  const mustFind = (id: string): SnapshotRow => {
    const row = snapshots.findById(id);
    if (!row)
      throw new NotFoundError("NOT_FOUND", "Snapshot not found", {
        details: { resource: "snapshot" },
      });
    return row;
  };

  async function runSnapshot(snapshotId: string, accountIds: string[]): Promise<void> {
    const startedAt = Date.now();
    let contactCount = 0;
    let currentAccountId: string | undefined;
    try {
      for (const accountId of accountIds) {
        currentAccountId = accountId;
        const account = accountsRepository.findById(accountId);
        const auth = await accountService.getAuthorizedClient(accountId);
        const provider = createProvider({ auth, accountId: accountId as AccountId });
        const before = contactCount;
        const result = await provider.listContacts({
          includeOtherContacts: account?.grantedScopes.includes("contacts.other.readonly") ?? false,
          onProgress: (fetched) => progress.set(snapshotId, before + fetched),
        });
        snapshots.insertContacts({
          snapshotId,
          accountId,
          contacts: result.contacts,
          nextId: () => ids.next(),
        });
        contactCount += result.contacts.length;
        accountsRepository.markSynced(accountId);
      }
      snapshots.complete(snapshotId, { contactCount, accountCount: accountIds.length });
      const pruned = snapshots.pruneCompleted(SNAPSHOTS_TO_KEEP);
      log.info(
        {
          snapshotId,
          contactCount,
          accountCount: accountIds.length,
          pruned,
          durationMs: Date.now() - startedAt,
        },
        "snapshot completed",
      );
    } catch (error) {
      const code = isContactFuseError(error) ? error.code : "INTERNAL_ERROR";
      if (error instanceof AuthError && error.code === "TOKEN_EXPIRED" && currentAccountId) {
        accountService.markNeedsReauth(currentAccountId);
      }
      snapshots.fail(snapshotId, code);
      log.warn({ snapshotId, accountId: currentAccountId, code }, "snapshot failed");
    } finally {
      progress.delete(snapshotId);
    }
  }

  return {
    start() {
      if (snapshots.findRunning()) {
        throw new ConflictError("RUN_IN_PROGRESS", "A backup is already running");
      }
      const accountIds = accountsRepository
        .list()
        .filter((account) => account.status === "connected")
        .map((account) => account.id);
      if (accountIds.length === 0) {
        throw new AuthError("AUTH_REQUIRED", "Connect an account before taking a backup");
      }
      const row = snapshots.insertRunning(ids.next());
      progress.set(row.id, 0);
      running = runSnapshot(row.id, accountIds);
      const [dto] = toDtos([row]);
      if (!dto) throw new NotFoundError("NOT_FOUND", "Snapshot not found");
      return dto;
    },
    list: () => toDtos(snapshots.listNewestFirst()),
    get(id) {
      const [dto] = toDtos([mustFind(id)]);
      if (!dto) throw new NotFoundError("NOT_FOUND", "Snapshot not found");
      return dto;
    },
    requireCompleted(id) {
      const row = mustFind(id);
      if (row.status !== "completed") {
        throw new ConflictError("SNAPSHOT_INCOMPLETE", "Only completed backups can be exported", {
          details: { status: row.status },
        });
      }
      return row;
    },
    delete(id) {
      const row = mustFind(id);
      if (row.status === "running") {
        throw new ConflictError("RUN_IN_PROGRESS", "Wait for the backup to finish first");
      }
      snapshots.delete(id);
    },
    isRunning: () => snapshots.findRunning() !== undefined,
    idle: () => running,
  };
}
