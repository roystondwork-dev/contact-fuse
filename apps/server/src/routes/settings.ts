import type { FastifyInstance } from "fastify";

import { GoogleClientBodySchema } from "../schemas/settings.ts";
import type { GoogleClientService } from "../services/google-client-service.ts";

export function registerSettingsRoutes(
  app: FastifyInstance,
  deps: { googleClient: GoogleClientService },
): void {
  app.get("/api/v1/settings/google-client", async () => deps.googleClient.getStatus());

  app.put("/api/v1/settings/google-client", async (request) => {
    const body = GoogleClientBodySchema.parse(request.body);
    return deps.googleClient.save(body);
  });

  app.delete("/api/v1/settings/google-client", async (_request, reply) => {
    await deps.googleClient.remove();
    return reply.status(204).send();
  });
}
