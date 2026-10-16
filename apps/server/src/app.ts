import Fastify, { type FastifyInstance } from "fastify";

import type { Clock, IdGenerator } from "@contact-fuse/core";

import { createGoogleOauth, type GoogleOauth } from "./auth/google-oauth.ts";
import type { SecretStore } from "./auth/secret-store.ts";
import type { Config } from "./config.ts";
import type { Db } from "./db/client.ts";
import { createAccountsRepository } from "./db/repositories/accounts-repository.ts";
import { createSettingsRepository } from "./db/repositories/settings-repository.ts";
import { createSnapshotsRepository } from "./db/repositories/snapshots-repository.ts";
import { registerErrorHandlers } from "./errors.ts";
import { buildLoggerOptions } from "./logger.ts";
import { registerSecurity } from "./plugins/security.ts";
import { hasWebUiBuild, registerWebUi } from "./plugins/web-ui.ts";
import { registerAccountRoutes } from "./routes/accounts.ts";
import { registerLocalDataRoutes } from "./routes/local-data.ts";
import { registerOauthCallbackRoute } from "./routes/oauth-callback.ts";
import { registerSettingsRoutes } from "./routes/settings.ts";
import { registerSnapshotRoutes } from "./routes/snapshots.ts";
import { createAccountService } from "./services/account-service.ts";
import { createGoogleClientService } from "./services/google-client-service.ts";
import { createLocalDataService } from "./services/local-data-service.ts";
import { createSnapshotService, type ProviderFactory } from "./services/snapshot-service.ts";

export interface AppDependencies {
  config: Pick<Config, "port" | "logLevel" | "devUiOrigin"> & { dataDir?: string; uiDir?: string };
  db: Db;
  clock: Clock;
  ids: IdGenerator;
  /** OS keychain in production; an in-memory store in tests. */
  secrets: SecretStore;
  /** Overridable in tests; defaults to the real Google OAuth flow. */
  oauth?: GoogleOauth;
  /** Overridable in tests; defaults to the Google People API provider. */
  createProvider?: ProviderFactory;
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

  registerErrorHandlers(app, { spaFallback: hasWebUiBuild(deps.config.uiDir) });
  await registerSecurity(app, {
    getPort,
    ...(deps.config.devUiOrigin ? { devUiOrigin: deps.config.devUiOrigin } : {}),
  });

  const settings = createSettingsRepository(deps.db, deps.clock);
  const googleClient = createGoogleClientService({ settings, secrets: deps.secrets });
  const accountsRepository = createAccountsRepository(deps.db, deps.clock);
  const snapshots = createSnapshotsRepository(deps.db, deps.clock);
  const accounts = createAccountService({
    accounts: accountsRepository,
    secrets: deps.secrets,
    oauth: deps.oauth ?? createGoogleOauth(deps.clock),
    googleClient,
    ids: deps.ids,
    log: app.log,
  });

  const snapshotService = createSnapshotService({
    snapshots,
    accountsRepository,
    accountService: accounts,
    ids: deps.ids,
    log: app.log,
    ...(deps.createProvider ? { createProvider: deps.createProvider } : {}),
  });
  const localData = createLocalDataService({
    ...(deps.config.dataDir ? { dataDir: deps.config.dataDir } : {}),
    accountsRepository,
    snapshots,
    settings,
    secrets: deps.secrets,
    accountService: accounts,
    googleClient,
    snapshotService,
    log: app.log,
  });
  // Let a running backup finish writing before the database closes.
  app.addHook("onClose", async () => snapshotService.idle());

  app.get("/api/health", async () => ({ status: "ok" }));
  await registerWebUi(app, deps.config.uiDir);
  registerSettingsRoutes(app, { googleClient });
  registerAccountRoutes(app, { accounts, getPort });
  registerOauthCallbackRoute(app, { accounts });
  registerSnapshotRoutes(app, { snapshotService, snapshots });
  registerLocalDataRoutes(app, { localData });

  return app;
}
