import { describe, expect, it } from "vitest";
import { PROVIDER_ID } from "./index.ts";

describe("provider-google", () => {
  it("identifies itself as the google provider", () => {
    expect(PROVIDER_ID).toBe("google");
  });
});
