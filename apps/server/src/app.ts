import Fastify, { type FastifyInstance } from "fastify";

import type { Clock, IdGenerator } from "@contact-fuse/core";

import type { Config } from "./config.ts";
import type { Db } from "./db/client.ts";
import { registerErrorHandlers } from "./errors.ts";
import { buildLoggerOptions } from "./logger.ts";
import { registerSecurity } from "./plugins/security.ts";

export interface AppDependencies {
  config: Pick<Config, "port" | "logLevel" | "devUiOrigin">;
  db: Db;
  clock: Clock;
  ids: IdGenerator;
}

export async function buildApp(deps: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(deps.config),
    bodyLimit: 1024 * 1024,
  });

  registerErrorHandlers(app);
  await registerSecurity(app, {
    getPort: () => {
      const address = app.server.address();
      return typeof address === "object" && address ? address.port : deps.config.port;
    },
    ...(deps.config.devUiOrigin ? { devUiOrigin: deps.config.devUiOrigin } : {}),
  });

  app.get("/api/health", async () => ({ status: "ok" }));

  return app;
}
