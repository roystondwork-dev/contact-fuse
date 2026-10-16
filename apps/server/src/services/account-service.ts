import type { FastifyBaseLogger } from "fastify";
import type { OAuth2Client } from "google-auth-library";

import { AuthError, NotFoundError, type AccountId, type IdGenerator } from "@contact-fuse/core";

import { GOOGLE_SCOPES, type GoogleOauth } from "../auth/google-oauth.ts";
import { SECRET_KEYS, type SecretStore } from "../auth/secret-store.ts";
import type { AccountRow, AccountsRepository } from "../db/repositories/accounts-repository.ts";
import type { GoogleClientService } from "./google-client-service.ts";

/** API shape (docs/architecture/http-api.md#accounts). */
export interface AccountDto {
  id: string;
  provider: "google";
  email: string;
  displayName?: string;
  isMain: boolean;
  status: AccountRow["status"];
  includesOtherContacts: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  /** Changes on every connect, reconnect, status change and backup. */
  updatedAt: string;
}

export function toAccountDto(row: AccountRow): AccountDto {
  return {
    id: row.id,
    provider: "google",
    email: row.email,
    ...(row.displayName ? { displayName: row.displayName } : {}),
    isMain: row.isMain,
    status: row.status,
    includesOtherContacts: row.grantedScopes.split(" ").includes(GOOGLE_SCOPES.otherContactsRead),
    ...(row.lastSyncedAt ? { lastSyncedAt: row.lastSyncedAt } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface AccountService {
  list(): AccountDto[];
  startConnect(options: { redirectUri: string; includeOtherContacts: boolean }): Promise<string>;
  completeConnect(options: { code: string; state: string }): Promise<AccountDto>;
  disconnect(accountId: string): Promise<void>;
  /** An OAuth client that can call Google on behalf of a connected account. */
  getAuthorizedClient(accountId: string): Promise<OAuth2Client>;
  markNeedsReauth(accountId: string): void;
}

export function createAccountService(deps: {
  accounts: AccountsRepository;
  secrets: SecretStore;
  oauth: GoogleOauth;
  googleClient: GoogleClientService;
  ids: IdGenerator;
  log: FastifyBaseLogger;
}): AccountService {
  const { accounts, secrets, oauth, googleClient, ids, log } = deps;

  const mustFind = (accountId: string): AccountRow => {
    const row = accounts.findById(accountId);
    if (!row) throw new NotFoundError("ACCOUNT_NOT_FOUND", "Account not found");
    return row;
  };

  return {
    list: () => accounts.list().map(toAccountDto),

    async startConnect({ redirectUri, includeOtherContacts }) {
      const credentials = await googleClient.requireCredentials();
      return oauth.createAuthorizationUrl({ credentials, redirectUri, includeOtherContacts });
    },

    async completeConnect({ code, state }) {
      const credentials = await googleClient.requireCredentials();
      const identity = await oauth.completeAuthorization({ credentials, code, state });
      const existing = accounts.findByProviderAccount("google", identity.subject);
      const accountId = (existing?.id ?? ids.next()) as AccountId;

      // Token first: if the keychain fails, no account row points at a missing token.
      await secrets.set(SECRET_KEYS.refreshToken(accountId), identity.refreshToken);
      const row = existing
        ? accounts.markReconnected(accountId, identity)
        : accounts.insertConnected({
            id: accountId,
            provider: "google",
            providerAccountId: identity.subject,
            email: identity.email,
            grantedScopes: identity.grantedScopes,
          });
      log.info({ accountId, reconnected: Boolean(existing) }, "account connected");
      return toAccountDto(row);
    },

    async disconnect(accountId) {
      mustFind(accountId);
      const key = SECRET_KEYS.refreshToken(accountId);
      const refreshToken = await secrets.get(key);
      if (refreshToken) {
        try {
          await oauth.revoke(await googleClient.requireCredentials(), refreshToken);
        } catch (error) {
          // Best effort: the token is deleted locally either way, and the user can also remove
          // access at myaccount.google.com. Log the code only, never the token.
          log.warn({ accountId, err: { name: (error as Error).name } }, "token revoke failed");
        }
        await secrets.delete(key);
      }
      accounts.setStatus(accountId, "disconnected");
      log.info({ accountId }, "account disconnected");
    },

    async getAuthorizedClient(accountId) {
      const row = mustFind(accountId);
      if (row.status === "disconnected") {
        throw new AuthError("AUTH_REQUIRED", "Account is disconnected", { details: { accountId } });
      }
      const refreshToken = await secrets.get(SECRET_KEYS.refreshToken(accountId));
      if (!refreshToken) {
        accounts.setStatus(accountId, "needs-reauth");
        throw new AuthError("TOKEN_EXPIRED", "No stored token for account", {
          details: { accountId },
        });
      }
      return oauth.createAuthorizedClient(await googleClient.requireCredentials(), refreshToken);
    },

    markNeedsReauth(accountId) {
      accounts.setStatus(accountId, "needs-reauth");
    },
  };
}
