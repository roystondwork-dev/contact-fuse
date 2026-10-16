import { join } from "node:path";

import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { ensureDataDir } from "./data-dir.ts";
import { openDatabase } from "./db/client.ts";
import { uuidV7Ids } from "./ids.ts";

const config = loadConfig();
await ensureDataDir(config.dataDir);
const { db } = openDatabase({ path: join(config.dataDir, "contact-fuse.sqlite") });

const app = await buildApp({ config, db, clock: { now: () => new Date() }, ids: uuidV7Ids });

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
