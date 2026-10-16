import { describe, expect, it } from "vitest";
import { ApiError } from "./api-client.ts";
import { getErrorCode, getErrorCopy } from "./error-copy.ts";

describe("getErrorCopy", () => {
  it.each([
    ["SERVER_UNREACHABLE", "Can't reach contact-fuse"],
    ["NETWORK_ERROR", "Can't reach Google"],
    ["OAUTH_CLIENT_MISSING", "Google isn't set up yet"],
    ["AUTH_REQUIRED", "No connected accounts"],
    ["RUN_IN_PROGRESS", "A backup is already running"],
    ["TOKEN_EXPIRED", "Your Google sign-in has expired"],
    ["OAUTH_INVALID_CLIENT", "Google didn't accept the client ID or secret"],
    ["GOOGLE_RATE_LIMITED", "Google asked us to slow down"],
    ["FORBIDDEN_REQUEST", "This request was blocked"],
  ])("maps %s to its own title", (code, title) => {
    expect(getErrorCopy(code).title).toBe(title);
  });

  it("falls back to the generic copy for unknown codes", () => {
    expect(getErrorCopy("SOMETHING_NEW")).toEqual(getErrorCopy("INTERNAL_ERROR"));
    expect(getErrorCopy("SOMETHING_NEW").title).toBe("Something unexpected happened");
  });

  it("answers whether contacts are safe for every code", () => {
    for (const code of ["NETWORK_ERROR", "RUN_IN_PROGRESS", "INTERNAL_ERROR", "UNKNOWN"]) {
      expect(getErrorCopy(code).safety).toMatch(/^Yes\./);
    }
  });
});

describe("getErrorCode", () => {
  it("uses the ApiError code and treats anything else as INTERNAL_ERROR", () => {
    expect(getErrorCode(new ApiError(409, "RUN_IN_PROGRESS"))).toBe("RUN_IN_PROGRESS");
    expect(getErrorCode(new Error("boom"))).toBe("INTERNAL_ERROR");
    expect(getErrorCode("boom")).toBe("INTERNAL_ERROR");
  });
});
