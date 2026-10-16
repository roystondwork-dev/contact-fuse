import { randomBytes } from "node:crypto";

import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import { z } from "zod";

import { AuthError, ProviderError, type Clock } from "@contact-fuse/core";

/**
 * Installed-app OAuth 2.0 with PKCE and a loopback redirect (RFC 8252). See
 * docs/architecture/security-and-privacy.md#oauth and ADR 0006.
 */
export const GOOGLE_SCOPES = {
  identity: ["openid", "email"],
  // M1 only reads. Write access is requested incrementally when merging needs it (M3).
  contactsRead: "https://www.googleapis.com/auth/contacts.readonly",
  otherContactsRead: "https://www.googleapis.com/auth/contacts.other.readonly",
} as const;

const STATE_TTL_MS = 10 * 60 * 1000;
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

export interface GoogleClientCredentials {
  clientId: string;
  clientSecret: string;
}

export interface GoogleIdentity {
  /** Stable Google account ID (`sub`). */
  subject: string;
  email: string;
  refreshToken: string;
  grantedScopes: string[];
}

interface PendingAuthorization {
  codeVerifier: string;
  redirectUri: string;
  expiresAt: number;
}

const IdTokenClaimsSchema = z.object({
  iss: z.string(),
  aud: z.string(),
  sub: z.string().min(1),
  email: z.string().min(3),
  email_verified: z.boolean().optional(),
  exp: z.number(),
});

export interface GoogleOauth {
  createAuthorizationUrl(options: {
    credentials: GoogleClientCredentials;
    redirectUri: string;
    includeOtherContacts: boolean;
  }): Promise<string>;
  completeAuthorization(options: {
    credentials: GoogleClientCredentials;
    code: string;
    state: string;
  }): Promise<GoogleIdentity>;
  revoke(credentials: GoogleClientCredentials, refreshToken: string): Promise<void>;
  createAuthorizedClient(credentials: GoogleClientCredentials, refreshToken: string): OAuth2Client;
}

export function createGoogleOauth(clock: Clock): GoogleOauth {
  const pending = new Map<string, PendingAuthorization>();

  const prune = (): void => {
    const now = clock.now().getTime();
    for (const [state, entry] of pending) if (entry.expiresAt <= now) pending.delete(state);
  };

  return {
    async createAuthorizationUrl({ credentials, redirectUri, includeOtherContacts }) {
      prune();
      const client = new OAuth2Client({ ...credentials, redirectUri });
      const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
      if (!codeChallenge)
        throw new AuthError("OAUTH_FLOW_FAILED", "Could not create PKCE challenge");
      const state = randomBytes(32).toString("base64url");
      pending.set(state, {
        codeVerifier,
        redirectUri,
        expiresAt: clock.now().getTime() + STATE_TTL_MS,
      });
      const scope = [
        ...GOOGLE_SCOPES.identity,
        GOOGLE_SCOPES.contactsRead,
        ...(includeOtherContacts ? [GOOGLE_SCOPES.otherContactsRead] : []),
      ];
      return client.generateAuthUrl({
        access_type: "offline",
        // Always show consent so Google returns a refresh token, also when reconnecting.
        prompt: "consent select_account",
        scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: CodeChallengeMethod.S256,
      });
    },

    async completeAuthorization({ credentials, code, state }) {
      prune();
      const entry = pending.get(state);
      // Single use: a state is consumed whether or not the exchange succeeds.
      pending.delete(state);
      if (!entry) {
        throw new AuthError("OAUTH_FLOW_FAILED", "Unknown, expired or reused OAuth state");
      }

      const client = new OAuth2Client({ ...credentials, redirectUri: entry.redirectUri });
      let tokens;
      try {
        ({ tokens } = await client.getToken({
          code,
          codeVerifier: entry.codeVerifier,
          redirect_uri: entry.redirectUri,
        }));
      } catch (error) {
        throw new AuthError("OAUTH_FLOW_FAILED", "Google rejected the authorization code", {
          cause: error,
        });
      }

      if (!tokens.refresh_token || !tokens.id_token) {
        throw new AuthError("OAUTH_FLOW_FAILED", "Google did not return the expected tokens");
      }
      const claims = readIdTokenClaims(tokens.id_token, credentials.clientId, clock);
      const grantedScopes = (tokens.scope ?? "").split(" ").filter(Boolean);
      if (!grantedScopes.includes(GOOGLE_SCOPES.contactsRead)) {
        // The user unticked the contacts permission on the consent screen.
        throw new ProviderError("PROVIDER_PERMISSION_DENIED", "Contacts permission not granted");
      }
      return {
        subject: claims.sub,
        email: claims.email,
        refreshToken: tokens.refresh_token,
        grantedScopes,
      };
    },

    async revoke(credentials, refreshToken) {
      const client = new OAuth2Client(credentials);
      await client.revokeToken(refreshToken);
    },

    createAuthorizedClient(credentials, refreshToken) {
      const client = new OAuth2Client(credentials);
      client.setCredentials({ refresh_token: refreshToken });
      return client;
    },
  };
}

/**
 * The ID token comes straight from Google's token endpoint over TLS, so per OpenID Connect Core
 * §3.1.3.7 the TLS connection authenticates the issuer and the signature check may be skipped.
 * Audience, issuer and expiry are still verified.
 */
function readIdTokenClaims(
  idToken: string,
  clientId: string,
  clock: Clock,
): z.infer<typeof IdTokenClaimsSchema> {
  const payload = idToken.split(".")[1];
  const parsed = IdTokenClaimsSchema.safeParse(
    payload ? safeJson(Buffer.from(payload, "base64url").toString("utf8")) : undefined,
  );
  if (!parsed.success) throw new AuthError("OAUTH_FLOW_FAILED", "Malformed ID token");
  const claims = parsed.data;
  const nowSeconds = Math.floor(clock.now().getTime() / 1000);
  if (claims.aud !== clientId || !GOOGLE_ISSUERS.has(claims.iss) || claims.exp <= nowSeconds) {
    throw new AuthError("OAUTH_FLOW_FAILED", "ID token failed validation");
  }
  if (claims.email_verified === false) {
    throw new AuthError("OAUTH_FLOW_FAILED", "Google account email is not verified");
  }
  return claims;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
