import { buildApp } from "./app.ts";

// Bind to loopback only: contact data must never be reachable from the network.
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT ?? 4317);

const app = buildApp();
await app.listen({ host: HOST, port: PORT });
