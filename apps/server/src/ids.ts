import { v7 as uuidv7 } from "uuid";

import type { IdGenerator } from "@contact-fuse/core";

/** UUIDv7: time-sortable, globally unique, safe to expose (docs/standards/database.md). */
export const uuidV7Ids: IdGenerator = { next: () => uuidv7() };
