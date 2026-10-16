import { describe, expect, it } from "vitest";
import {
  AuthError,
  ContactFuseError,
  ProviderError,
  SafetyError,
  ValidationError,
  isContactFuseError,
} from "./errors.ts";

describe("errors", () => {
  it("carries code, status, retryability and details", () => {
    const error = new ProviderError("PROVIDER_RATE_LIMITED", "rate limited", {
      details: { accountId: "acc_1" },
    });
    expect(error).toBeInstanceOf(ContactFuseError);
    expect(error.name).toBe("ProviderError");
    expect(error.code).toBe("PROVIDER_RATE_LIMITED");
    expect(error.httpStatus).toBe(503);
    expect(error.isRetryable).toBe(true);
    expect(error.details).toEqual({ accountId: "acc_1" });
  });

  it.each([
    [new ValidationError("VALIDATION_FAILED", "x"), 400],
    [new ValidationError("INVALID_SETTINGS", "x"), 422],
    [new AuthError("TOKEN_EXPIRED", "x"), 401],
    [new AuthError("OAUTH_CLIENT_MISSING", "x"), 412],
    [new AuthError("FORBIDDEN_REQUEST", "x"), 403],
    [new SafetyError("PLAN_OUTDATED", "x"), 409],
    [new ProviderError("PROVIDER_UNAVAILABLE", "x"), 502],
  ])("maps %s to HTTP %i", (error, status) => {
    expect(error.httpStatus).toBe(status);
  });

  it("keeps the original error as cause", () => {
    const cause = new Error("socket hang up");
    expect(new ProviderError("PROVIDER_UNAVAILABLE", "x", { cause }).cause).toBe(cause);
  });

  it("recognises its own errors only", () => {
    expect(isContactFuseError(new AuthError("AUTH_REQUIRED", "x"))).toBe(true);
    expect(isContactFuseError(new Error("x"))).toBe(false);
  });
});
