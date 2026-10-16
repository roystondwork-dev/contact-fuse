import type { FastifyInstance } from "fastify";

import { AccountParamsSchema, ConnectBodySchema } from "../schemas/accounts.ts";
import type { AccountService } from "../services/account-service.ts";

export const OAUTH_CALLBACK_PATH = "/oauth/callback";

export function registerAccountRoutes(
  app: FastifyInstance,
  deps: { accounts: AccountService; getPort: () => number },
): void {
  app.get("/api/v1/accounts", async () => ({ items: deps.accounts.list(), nextCursor: null }));

  app.post("/api/v1/accounts/connect", async (request) => {
    const body = ConnectBodySchema.parse(request.body);
    const authorizationUrl = await deps.accounts.startConnect({
      // Loopback redirect on the port actually in use (RFC 8252 §7.3).
      redirectUri: `http://127.0.0.1:${deps.getPort()}${OAUTH_CALLBACK_PATH}`,
      includeOtherContacts: body.includeOtherContacts,
    });
    return { authorizationUrl };
  });

  app.delete("/api/v1/accounts/:id", async (request, reply) => {
    const { id } = AccountParamsSchema.parse(request.params);
    await deps.accounts.disconnect(id);
    return reply.status(204).send();
  });
}
