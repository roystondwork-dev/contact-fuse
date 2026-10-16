import { describe, expect, it } from "vitest";

import { ProviderError } from "@contact-fuse/core";

import { RETRY_POLICY, computeBackoffMs, defaultSleep, withRetry } from "./retry.ts";

function recordingSleep(): { sleeps: number[]; sleep: (ms: number) => Promise<void> } {
  const sleeps: number[] = [];
  return {
    sleeps,
    sleep: (ms) => {
      sleeps.push(ms);
      return Promise.resolve();
    },
  };
}

function failTimes(
  count: number,
  error: Error,
): { calls: () => number; run: () => Promise<string> } {
  let calls = 0;
  return {
    calls: () => calls,
    run: () => {
      calls += 1;
      return calls <= count ? Promise.reject(error) : Promise.resolve("ok");
    },
  };
}

const unavailable = new ProviderError("PROVIDER_UNAVAILABLE", "Synthetic outage");

describe("computeBackoffMs", () => {
  it.each([
    [1, 1, 500],
    [2, 1, 1000],
    [3, 1, 2000],
    [4, 0.5, 2000],
    [1, 0, 0],
  ])(
    "caps the jitter at base × 2^(attempt-1) for attempt %i and random %f",
    (attempt, r, expected) => {
      expect(computeBackoffMs(attempt, () => r)).toBe(expected);
    },
  );
});

describe("withRetry", () => {
  it("retries retryable errors with full-jitter exponential backoff", async () => {
    const { sleeps, sleep } = recordingSleep();
    const op = failTimes(3, unavailable);

    const result = await withRetry(op.run, { sleep, random: () => 0.5 });

    expect(result).toBe("ok");
    expect(op.calls()).toBe(4);
    expect(sleeps).toEqual([250, 500, 1000]);
  });

  it("gives up after the maximum number of attempts", async () => {
    const { sleeps, sleep } = recordingSleep();
    const op = failTimes(10, unavailable);

    await expect(withRetry(op.run, { sleep, random: () => 0.5 })).rejects.toBe(unavailable);

    expect(op.calls()).toBe(RETRY_POLICY.maxAttempts);
    expect(sleeps).toHaveLength(RETRY_POLICY.maxAttempts - 1);
  });

  it("does not retry non-retryable or foreign errors", async () => {
    const { sleeps, sleep } = recordingSleep();
    const invalid = failTimes(1, new ProviderError("PROVIDER_INVALID_REQUEST", "Synthetic"));
    const foreign = failTimes(1, new TypeError("bug"));

    await expect(withRetry(invalid.run, { sleep, random: () => 0.5 })).rejects.toThrow("Synthetic");
    await expect(withRetry(foreign.run, { sleep, random: () => 0.5 })).rejects.toThrow("bug");

    expect(invalid.calls() + foreign.calls()).toBe(2);
    expect(sleeps).toEqual([]);
  });

  it("waits for Retry-After instead of the computed backoff", async () => {
    const { sleeps, sleep } = recordingSleep();
    const limited = new ProviderError("PROVIDER_RATE_LIMITED", "Synthetic", {
      details: { retryAfterMs: 3000 },
    });
    const op = failTimes(1, limited);

    await withRetry(op.run, { sleep, random: () => 0.5 });

    expect(sleeps).toEqual([3000]);
  });

  it("surfaces the error when Retry-After is longer than the policy allows", async () => {
    const { sleeps, sleep } = recordingSleep();
    const limited = new ProviderError("PROVIDER_RATE_LIMITED", "Synthetic", {
      details: { retryAfterMs: RETRY_POLICY.maxRetryAfterMs + 1 },
    });

    await expect(withRetry(failTimes(1, limited).run, { sleep, random: () => 0 })).rejects.toBe(
      limited,
    );
    expect(sleeps).toEqual([]);
  });

  it("stops before the first attempt when the signal is already aborted", async () => {
    const { sleep } = recordingSleep();
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    const op = failTimes(0, unavailable);

    await expect(
      withRetry(op.run, { sleep, random: () => 0, signal: controller.signal }),
    ).rejects.toThrow("cancelled");
    expect(op.calls()).toBe(0);
  });
});

describe("defaultSleep", () => {
  it("resolves after the delay", async () => {
    await expect(defaultSleep(1)).resolves.toBeUndefined();
  });

  it("rejects when aborted before or during the wait", async () => {
    const before = new AbortController();
    before.abort(new Error("before"));
    const during = new AbortController();

    const pending = defaultSleep(10_000, during.signal);
    during.abort(new Error("during"));

    await expect(defaultSleep(10, before.signal)).rejects.toThrow("before");
    await expect(pending).rejects.toThrow("during");
  });
});
