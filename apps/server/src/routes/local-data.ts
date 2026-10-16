import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { LocalDataService } from "../services/local-data-service.ts";

// The UI makes the user type DELETE; the API requires the same word as a guard against accidents.
const DeleteBodySchema = z.object({ confirm: z.literal("DELETE") });

export function registerLocalDataRoutes(
  app: FastifyInstance,
  deps: { localData: LocalDataService },
): void {
  app.post("/api/v1/local-data/delete", async (request, reply) => {
    DeleteBodySchema.parse(request.body);
    await deps.localData.deleteAll();
    return reply.status(204).send();
  });
}
