import { Entry } from "@napi-rs/keyring";

import { StorageError } from "@contact-fuse/core";

/**
 * Secrets (OAuth refresh tokens, the OAuth client secret) live only in the OS keychain: never in
 * SQLite, files or logs (docs/architecture/security-and-privacy.md).
 */
export interface SecretStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export const KEYCHAIN_SERVICE = "contact-fuse";

export const SECRET_KEYS = {
  refreshToken: (accountId: string) => `refresh-token:${accountId}`,
  googleClientSecret: "google-oauth-client-secret",
} as const;

export function createKeychainSecretStore(service = KEYCHAIN_SERVICE): SecretStore {
  const wrap = async <T>(action: () => T): Promise<T> => {
    try {
      return action();
    } catch (error) {
      throw new StorageError("KEYCHAIN_UNAVAILABLE", "The OS keychain is not available", {
        cause: error,
      });
    }
  };
  return {
    get: (key) => wrap(() => new Entry(service, key).getPassword() ?? undefined),
    set: (key, value) => wrap(() => new Entry(service, key).setPassword(value)),
    delete: (key) =>
      wrap(() => {
        new Entry(service, key).deletePassword();
      }),
  };
}

/** For tests and for running without a keychain. Never used in production. */
export function createMemorySecretStore(): SecretStore & { keys(): string[] } {
  const values = new Map<string, string>();
  return {
    get: async (key) => values.get(key),
    set: async (key, value) => {
      values.set(key, value);
    },
    delete: async (key) => {
      values.delete(key);
    },
    keys: () => [...values.keys()],
  };
}
