import { describe, expect, it } from "vitest";
import { buildApp } from "./app.ts";

describe("server", () => {
  it("reports health", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});
