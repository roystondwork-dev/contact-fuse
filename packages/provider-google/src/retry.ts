import { isContactFuseError } from "@contact-fuse/core";

/** Waits `ms` milliseconds; rejects with the signal's reason if it is aborted first. */
export type Sleep = (ms: number, signal?: AbortSignal) => Promise<void>;

/** Policy from docs/standards/error-handling-and-logging.md#4-handling-rules. */
export const RETRY_POLICY = {
  baseDelayMs: 500,
  factor: 2,
  maxAttempts: 5,
  /** A `Retry-After` longer than this is not waited out; the error surfaces so the run can pause. */
  maxRetryAfterMs: 60_000,
} as const;

export interface RetryOptions {
  sleep: Sleep;
  /** Returns a number in [0, 1), like `Math.random`. Injected for deterministic tests. */
  random: () => number;
  signal?: AbortSignal;
}

export const defaultSleep: Sleep = (ms, signal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

/** Full-jitter exponential backoff before retry number `attempt` (1-based). */
export function computeBackoffMs(attempt: number, random: () => number): number {
  const ceiling = RETRY_POLICY.baseDelayMs * RETRY_POLICY.factor ** (attempt - 1);
  return Math.floor(random() * ceiling);
}

/**
 * Runs an idempotent operation, retrying only `ContactFuseError`s marked `isRetryable`. A numeric
 * `details.retryAfterMs` (from a `Retry-After` header) replaces the computed backoff.
 */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    options.signal?.throwIfAborted();
    try {
      return await operation();
    } catch (error) {
      if (!isContactFuseError(error) || !error.isRetryable) throw error;
      if (attempt >= RETRY_POLICY.maxAttempts) throw error;

      const retryAfterMs = error.details?.["retryAfterMs"];
      if (typeof retryAfterMs === "number" && retryAfterMs > RETRY_POLICY.maxRetryAfterMs) {
        throw error;
      }
      const delayMs =
        typeof retryAfterMs === "number" ? retryAfterMs : computeBackoffMs(attempt, options.random);
      await options.sleep(delayMs, options.signal);
    }
  }
}
