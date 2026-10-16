import Fastify, { type FastifyInstance } from "fastify";

import type { Clock, IdGenerator } from "@contact-fuse/core";

import { createGoogleOauth, type GoogleOauth } from "./auth/google-oauth.ts";
import type { SecretStore } from "./auth/secret-store.ts";
import type { Config } from "./config.ts";
import type { Db } from "./db/client.ts";
import { createAccountsRepository } from "./db/repositories/accounts-repository.ts";
import { createSettingsRepository } from "./db/repositories/settings-repository.ts";
import { registerErrorHandlers } from "./errors.ts";
import { buildLoggerOptions } from "./logger.ts";
import { registerSecurity } from "./plugins/security.ts";
import { registerAccountRoutes } from "./routes/accounts.ts";
import { registerOauthCallbackRoute } from "./routes/oauth-callback.ts";
import { registerSettingsRoutes } from "./routes/settings.ts";
import { createAccountService } from "./services/account-service.ts";
import { createGoogleClientService } from "./services/google-client-service.ts";

export interface AppDependencies {
  config: Pick<Config, "port" | "logLevel" | "devUiOrigin">;
  db: Db;
  clock: Clock;
  ids: IdGenerator;
  /** OS keychain in production; an in-memory store in tests. */
  secrets: SecretStore;
  /** Overridable in tests; defaults to the real Google OAuth flow. */
  oauth?: GoogleOauth;
}

export async function buildApp(deps: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(deps.config),
    bodyLimit: 1024 * 1024,
  });

  const getPort = (): number => {
    const address = app.server.address();
    return typeof address === "object" && address ? address.port : deps.config.port;
  };

  registerErrorHandlers(app);
  await registerSecurity(app, {
    getPort,
    ...(deps.config.devUiOrigin ? { devUiOrigin: deps.config.devUiOrigin } : {}),
  });

  const settings = createSettingsRepository(deps.db, deps.clock);
  const googleClient = createGoogleClientService({ settings, secrets: deps.secrets });
  const accounts = createAccountService({
    accounts: createAccountsRepository(deps.db, deps.clock),
    secrets: deps.secrets,
    oauth: deps.oauth ?? createGoogleOauth(deps.clock),
    googleClient,
    ids: deps.ids,
    log: app.log,
  });

  app.get("/api/health", async () => ({ status: "ok" }));
  registerSettingsRoutes(app, { googleClient });
  registerAccountRoutes(app, { accounts, getPort });
  registerOauthCallbackRoute(app, { accounts });

  return app;
}
