/**
 * Error hierarchy shared by every package. Codes are part of the public API: never rename one
 * after release. The catalog with meanings lives in docs/standards/error-handling-and-logging.md.
 */
export const ERROR_CODES = [
  "VALIDATION_FAILED",
  "INVALID_SETTINGS",
  "NOT_FOUND",
  "ACCOUNT_NOT_FOUND",
  "NO_MAIN_ACCOUNT",
  "SNAPSHOT_REQUIRED",
  "PLAN_OUTDATED",
  "RUN_ALREADY_APPLIED",
  "RUN_IN_PROGRESS",
  "UNDO_NOT_POSSIBLE",
  "ETAG_MISMATCH",
  "AUTH_REQUIRED",
  "TOKEN_EXPIRED",
  "OAUTH_CLIENT_MISSING",
  "OAUTH_FLOW_FAILED",
  "FORBIDDEN_REQUEST",
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_QUOTA_EXCEEDED",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_RESPONSE_INVALID",
  "PROVIDER_INVALID_REQUEST",
  "PROVIDER_PERMISSION_DENIED",
  "PROVIDER_SYNC_TOKEN_EXPIRED",
  "STORAGE_FAILED",
  "KEYCHAIN_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Primitives only, so whole objects (and the personal data inside them) cannot slip in. */
export type ErrorDetails = Readonly<Record<string, string | number | boolean>>;

export interface ContactFuseErrorOptions {
  cause?: unknown;
  httpStatus?: number;
  isRetryable?: boolean;
  details?: ErrorDetails;
}

export class ContactFuseError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly isRetryable: boolean;
  readonly details: ErrorDetails | undefined;

  constructor(code: ErrorCode, message: string, options: ContactFuseErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = options.httpStatus ?? 500;
    this.isRetryable = options.isRetryable ?? false;
    this.details = options.details;
  }
}

type SubclassOptions = Omit<ContactFuseErrorOptions, "httpStatus">;

export class ValidationError extends ContactFuseError {
  constructor(
    code: "VALIDATION_FAILED" | "INVALID_SETTINGS",
    message: string,
    options: SubclassOptions = {},
  ) {
    super(code, message, { ...options, httpStatus: code === "INVALID_SETTINGS" ? 422 : 400 });
  }
}

export class NotFoundError extends ContactFuseError {
  constructor(
    code: "NOT_FOUND" | "ACCOUNT_NOT_FOUND",
    message: string,
    options: SubclassOptions = {},
  ) {
    super(code, message, { ...options, httpStatus: 404 });
  }
}

export class ConflictError extends ContactFuseError {
  constructor(
    code: "RUN_ALREADY_APPLIED" | "RUN_IN_PROGRESS" | "UNDO_NOT_POSSIBLE" | "ETAG_MISMATCH",
    message: string,
    options: SubclassOptions = {},
  ) {
    super(code, message, { ...options, httpStatus: 409 });
  }
}

const AUTH_STATUS = {
  AUTH_REQUIRED: 401,
  TOKEN_EXPIRED: 401,
  OAUTH_CLIENT_MISSING: 412,
  OAUTH_FLOW_FAILED: 400,
  FORBIDDEN_REQUEST: 403,
} as const;

export class AuthError extends ContactFuseError {
  constructor(code: keyof typeof AUTH_STATUS, message: string, options: SubclassOptions = {}) {
    super(code, message, { ...options, httpStatus: AUTH_STATUS[code] });
  }
}

const PROVIDER_ERRORS = {
  PROVIDER_RATE_LIMITED: { httpStatus: 503, isRetryable: true },
  PROVIDER_QUOTA_EXCEEDED: { httpStatus: 503, isRetryable: false },
  PROVIDER_UNAVAILABLE: { httpStatus: 502, isRetryable: true },
  PROVIDER_RESPONSE_INVALID: { httpStatus: 502, isRetryable: false },
  PROVIDER_INVALID_REQUEST: { httpStatus: 502, isRetryable: false },
  PROVIDER_PERMISSION_DENIED: { httpStatus: 403, isRetryable: false },
  PROVIDER_SYNC_TOKEN_EXPIRED: { httpStatus: 502, isRetryable: false },
} as const;

export class ProviderError extends ContactFuseError {
  constructor(
    code: keyof typeof PROVIDER_ERRORS,
    message: string,
    options: Omit<SubclassOptions, "isRetryable"> = {},
  ) {
    super(code, message, { ...options, ...PROVIDER_ERRORS[code] });
  }
}

const SAFETY_STATUS = { NO_MAIN_ACCOUNT: 412, SNAPSHOT_REQUIRED: 412, PLAN_OUTDATED: 409 } as const;

export class SafetyError extends ContactFuseError {
  constructor(code: keyof typeof SAFETY_STATUS, message: string, options: SubclassOptions = {}) {
    super(code, message, { ...options, httpStatus: SAFETY_STATUS[code] });
  }
}

export class StorageError extends ContactFuseError {
  constructor(
    code: "STORAGE_FAILED" | "KEYCHAIN_UNAVAILABLE",
    message: string,
    options: SubclassOptions = {},
  ) {
    super(code, message, { ...options, httpStatus: 500 });
  }
}

export function isContactFuseError(error: unknown): error is ContactFuseError {
  return error instanceof ContactFuseError;
}
