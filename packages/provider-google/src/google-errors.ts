import { AuthError, ProviderError, isContactFuseError } from "@contact-fuse/core";
import type { ContactFuseError } from "@contact-fuse/core";

import { GoogleErrorBodySchema } from "./schemas.ts";

const SYNC_TOKEN_EXPIRED_REASON = "EXPIRED_SYNC_TOKEN";
const DAILY_QUOTA_REASONS = new Set(["dailyLimitExceeded", "dailyLimitExceededUnreg"]);

interface HttpErrorFacts {
  status: number | undefined;
  reasons: string[];
  quotaLimits: string[];
  isInvalidGrant: boolean;
  retryAfterMs: number | undefined;
}

/**
 * Converts an error thrown by the Google client (gaxios) into a `ContactFuseError`, so nothing
 * above the provider inspects Google error shapes. Returns `undefined` for errors that are not
 * Google/HTTP errors (e.g. programming bugs), which the caller rethrows unchanged.
 *
 * Messages and details carry only the operation name, HTTP status and Google reason codes, never
 * request or response bodies (which may contain contact data).
 */
export function toContactFuseError(
  error: unknown,
  operation: string,
): ContactFuseError | undefined {
  if (isContactFuseError(error)) return error;
  if (!(error instanceof Error)) return undefined;

  const facts = readHttpErrorFacts(error);
  const reason = facts.reasons[0];
  const details = {
    operation,
    ...(facts.status === undefined ? {} : { httpStatus: facts.status }),
    ...(reason === undefined ? {} : { reason }),
  };
  const options = { cause: error, details };

  if (facts.status === undefined) {
    if (!isNetworkError(error)) return undefined;
    return new ProviderError(
      "PROVIDER_UNAVAILABLE",
      `Google ${operation} failed: network error`,
      options,
    );
  }

  const status = facts.status;
  if (facts.isInvalidGrant || status === 401) {
    return new AuthError("TOKEN_EXPIRED", `Google ${operation} rejected the access token`, options);
  }
  if (status === 410 || facts.reasons.includes(SYNC_TOKEN_EXPIRED_REASON)) {
    return new ProviderError(
      "PROVIDER_SYNC_TOKEN_EXPIRED",
      `Google ${operation}: sync token expired`,
      options,
    );
  }
  if ((status === 429 || status === 403) && isDailyQuota(facts)) {
    return new ProviderError(
      "PROVIDER_QUOTA_EXCEEDED",
      `Google ${operation}: daily quota exhausted`,
      options,
    );
  }
  if (status === 429) {
    const retryDetails =
      facts.retryAfterMs === undefined ? details : { ...details, retryAfterMs: facts.retryAfterMs };
    return new ProviderError("PROVIDER_RATE_LIMITED", `Google ${operation} was rate limited`, {
      cause: error,
      details: retryDetails,
    });
  }
  // Every other 403 (ACCESS_TOKEN_SCOPE_INSUFFICIENT, PERMISSION_DENIED, ...) means a missing scope
  // or a disabled API: the user must reconnect, so it is never retried.
  if (status === 403) {
    return new ProviderError(
      "PROVIDER_PERMISSION_DENIED",
      `Google ${operation}: permission denied`,
      options,
    );
  }
  if (status === 408 || status >= 500) {
    return new ProviderError(
      "PROVIDER_UNAVAILABLE",
      `Google ${operation} failed with HTTP ${status}`,
      options,
    );
  }
  return new ProviderError(
    "PROVIDER_INVALID_REQUEST",
    `Google ${operation} rejected the request with HTTP ${status}`,
    options,
  );
}

function isDailyQuota(facts: HttpErrorFacts): boolean {
  return (
    facts.reasons.some((reason) => DAILY_QUOTA_REASONS.has(reason)) ||
    facts.quotaLimits.some((limit) => /per\s*day/i.test(limit))
  );
}

function isNetworkError(error: Error): boolean {
  // gaxios wraps fetch failures in a GaxiosError (recognisable by its request `config`) without a
  // response; fetch itself throws TypeError.
  return isRecord((error as Error & { config?: unknown }).config) || error instanceof TypeError;
}

function readHttpErrorFacts(error: Error): HttpErrorFacts {
  const record = error as Error & { status?: unknown; response?: unknown };
  const response = isRecord(record.response) ? record.response : undefined;
  const statusCandidate = response?.["status"] ?? record.status;
  const status = typeof statusCandidate === "number" ? statusCandidate : undefined;

  const facts: HttpErrorFacts = {
    status,
    reasons: [],
    quotaLimits: [],
    isInvalidGrant: false,
    retryAfterMs: parseRetryAfter(readHeader(response?.["headers"], "retry-after")),
  };

  const body = GoogleErrorBodySchema.safeParse(response?.["data"]);
  if (!body.success) return facts;
  const apiError = body.data.error;
  if (typeof apiError === "string") {
    facts.isInvalidGrant = apiError === "invalid_grant";
    return facts;
  }
  for (const detail of apiError.details ?? []) {
    if (detail.reason !== undefined) facts.reasons.push(detail.reason);
    const limit = detail.metadata?.["quota_limit"];
    if (limit !== undefined) facts.quotaLimits.push(limit);
  }
  for (const entry of apiError.errors ?? []) {
    if (entry.reason !== undefined) facts.reasons.push(entry.reason);
  }
  return facts;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readHeader(headers: unknown, name: string): string | undefined {
  if (!isRecord(headers)) return undefined;
  // gaxios may use a Headers class from another realm, so duck-type instead of `instanceof`.
  const get = headers["get"];
  if (typeof get === "function") {
    const value: unknown = get.call(headers, name);
    return typeof value === "string" ? value : undefined;
  }
  const value = headers[name];
  return typeof value === "string" ? value : undefined;
}

/** `Retry-After` is either delay-seconds or an HTTP date. */
export function parseRetryAfter(
  value: string | undefined,
  now: number = Date.now(),
): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  if (/^\d+$/.test(value.trim())) return Number(value.trim()) * 1000;
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - now);
}
