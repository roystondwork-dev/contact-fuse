import { describe, expect, it } from "vitest";

import { ProviderError } from "@contact-fuse/core";

import { parseRetryAfter, toContactFuseError } from "./google-errors.ts";

describe("toContactFuseError", () => {
  it("passes contact-fuse errors through unchanged", () => {
    const error = new ProviderError("PROVIDER_UNAVAILABLE", "Synthetic");

    expect(toContactFuseError(error, "people.get")).toBe(error);
  });

  it("returns undefined for errors that are not HTTP or network failures", () => {
    expect(toContactFuseError(new RangeError("bug"), "people.get")).toBeUndefined();
    expect(toContactFuseError("a string", "people.get")).toBeUndefined();
  });

  it("maps a 408 with plain-object headers to a retryable PROVIDER_UNAVAILABLE", () => {
    const error = Object.assign(new Error("timeout"), {
      response: { status: 408, headers: { "retry-after": "1" }, data: "not json" },
    });

    const mapped = toContactFuseError(error, "people.get");

    expect(mapped?.code).toBe("PROVIDER_UNAVAILABLE");
    expect(mapped?.isRetryable).toBe(true);
    expect(mapped?.cause).toBe(error);
  });
});

describe("parseRetryAfter", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");

  it.each([
    [undefined, undefined],
    ["", undefined],
    ["5", 5000],
    ["Thu, 01 Jan 2026 00:00:10 GMT", 10_000],
    ["Wed, 31 Dec 2025 23:59:00 GMT", 0],
    ["soon", undefined],
  ])("parses %j as %j milliseconds", (value, expected) => {
    expect(parseRetryAfter(value, now)).toBe(expected);
  });
});
