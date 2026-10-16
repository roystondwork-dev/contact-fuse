import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildApp } from "./app.ts";
import { createKeychainSecretStore } from "./auth/secret-store.ts";
import { loadConfig } from "./config.ts";
import { ensureDataDir } from "./data-dir.ts";
import { openDatabase } from "./db/client.ts";
import { uuidV7Ids } from "./ids.ts";

const config = loadConfig();
await ensureDataDir(config.dataDir);
const { db } = openDatabase({ path: join(config.dataDir, "contact-fuse.sqlite") });

// apps/web/dist, both from src/main.ts (dev) and from dist/main.mjs (build).
const uiDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../web/dist");

const app = await buildApp({
  config: { ...config, uiDir },
  db,
  clock: { now: () => new Date() },
  ids: uuidV7Ids,
  secrets: createKeychainSecretStore(),
});

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") throw error;
  // Configured port is busy: let the OS pick a free loopback port and print it.
  app.log.warn({ port: config.port }, "port in use, picking a free port");
  await app.listen({ host: config.host, port: 0 });
}

const shutdown = async (): Promise<void> => {
  await app.close();
  db.$client.close();
  process.exit(0);
};
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
