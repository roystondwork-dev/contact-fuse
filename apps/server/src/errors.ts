import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";

import {
  ContactFuseError,
  NotFoundError,
  ValidationError,
  type ErrorCode,
} from "@contact-fuse/core";

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: Record<string, string | number | boolean> };
}

function toBody(error: ContactFuseError): ErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: { ...error.details } } : {}),
    },
  };
}

/** Maps every error to `{ error: { code, message, details? } }` (docs/standards/api-design.md). */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    let mapped: ContactFuseError;
    if (error instanceof ContactFuseError) {
      mapped = error;
    } else if (error instanceof ZodError) {
      mapped = new ValidationError("VALIDATION_FAILED", "Request validation failed", {
        details: { fields: error.issues.map((issue) => issue.path.join(".")).join(",") },
      });
    } else if ("statusCode" in error && error.statusCode && error.statusCode < 500) {
      // Fastify's own client errors: malformed JSON, body too large, unsupported media type.
      mapped = new ContactFuseError("VALIDATION_FAILED", "Malformed request", {
        httpStatus: error.statusCode,
      });
    } else {
      mapped = new ContactFuseError("INTERNAL_ERROR", "Something went wrong", { cause: error });
    }

    if (mapped.httpStatus >= 500) {
      request.log.error({ code: mapped.code, error: describeErrorSafely(error) }, "request failed");
    } else {
      request.log.info({ code: mapped.code }, "request rejected");
    }
    void reply.status(mapped.httpStatus).send(toBody(mapped));
  });

  app.setNotFoundHandler((_request, reply) => {
    const error = new NotFoundError("NOT_FOUND", "Route not found");
    void reply.status(404).send(toBody(error));
  });
}

/**
 * What may be logged about an error: its class name, code and stack *locations*. Messages and
 * causes are dropped because errors from libraries (Google, SQLite) can contain request data,
 * tokens or contact details (docs/standards/error-handling-and-logging.md#5).
 */
export function describeErrorSafely(error: unknown): Record<string, string> {
  if (!(error instanceof Error)) return { name: typeof error };
  const frames = (error.stack ?? "")
    .split("\n")
    .filter((line) => line.trimStart().startsWith("at "))
    .slice(0, 10)
    .join("\n");
  return {
    name: error.name,
    ...(error instanceof ContactFuseError ? { code: error.code } : {}),
    ...(error.cause instanceof Error ? { causeName: error.cause.name } : {}),
    stack: frames,
  };
}
