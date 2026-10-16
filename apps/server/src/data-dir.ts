import { chmod, mkdir } from "node:fs/promises";

import { StorageError } from "@contact-fuse/core";

/** Creates the app-data directory readable only by the current OS user (0700). */
export async function ensureDataDir(dataDir: string): Promise<void> {
  try {
    await mkdir(dataDir, { recursive: true, mode: 0o700 });
    await chmod(dataDir, 0o700);
  } catch (error) {
    throw new StorageError("STORAGE_FAILED", "Could not create the data directory", {
      cause: error,
    });
  }
}
