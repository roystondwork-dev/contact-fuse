import { z } from "zod";

import { AuthError } from "@contact-fuse/core";

import { SECRET_KEYS, type SecretStore } from "../auth/secret-store.ts";
import type { GoogleClientCredentials } from "../auth/google-oauth.ts";
import type { SettingsRepository } from "../db/repositories/settings-repository.ts";

const SETTINGS_KEY = "google.oauthClient";
const StoredClientSchema = z.object({ clientId: z.string() });

export interface GoogleClientStatus {
  configured: boolean;
  clientId?: string;
}

export interface GoogleClientService {
  getStatus(): Promise<GoogleClientStatus>;
  save(credentials: GoogleClientCredentials): Promise<GoogleClientStatus>;
  remove(): Promise<void>;
  /** Throws OAUTH_CLIENT_MISSING when the user has not configured a client yet. */
  requireCredentials(): Promise<GoogleClientCredentials>;
}

/** The client ID lives in SQLite; the client secret only in the keychain. */
export function createGoogleClientService(deps: {
  settings: SettingsRepository;
  secrets: SecretStore;
}): GoogleClientService {
  const read = async (): Promise<GoogleClientCredentials | undefined> => {
    const stored = deps.settings.get(SETTINGS_KEY, StoredClientSchema);
    if (!stored) return undefined;
    const clientSecret = await deps.secrets.get(SECRET_KEYS.googleClientSecret);
    return clientSecret ? { clientId: stored.clientId, clientSecret } : undefined;
  };

  return {
    async getStatus() {
      const credentials = await read();
      return credentials
        ? { configured: true, clientId: credentials.clientId }
        : { configured: false };
    },
    async save({ clientId, clientSecret }) {
      await deps.secrets.set(SECRET_KEYS.googleClientSecret, clientSecret);
      deps.settings.set(SETTINGS_KEY, { clientId });
      return { configured: true, clientId };
    },
    async remove() {
      deps.settings.delete(SETTINGS_KEY);
      await deps.secrets.delete(SECRET_KEYS.googleClientSecret);
    },
    async requireCredentials() {
      const credentials = await read();
      if (!credentials) {
        throw new AuthError("OAUTH_CLIENT_MISSING", "Google OAuth client is not configured");
      }
      return credentials;
    },
  };
}
