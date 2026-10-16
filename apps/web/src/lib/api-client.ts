import type { ApiErrorBody, SessionResponse } from "./api-types.ts";

/** Error codes the client produces itself (the rest come from the server). */
export const CLIENT_ERROR_CODE = {
  serverUnreachable: "SERVER_UNREACHABLE",
  invalidResponse: "INVALID_RESPONSE",
} as const;

const FORBIDDEN_REQUEST = "FORBIDDEN_REQUEST";
const CSRF_HEADER = "x-csrf-token";
const SESSION_PATH = "/api/v1/session";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * A failed API call. `code` drives the copy the UI shows; the server's `message` is never kept,
 * so it cannot leak into the UI.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, code: string, details: Record<string, unknown> = {}) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiClientOptions = {
  /** Origin to resolve paths against. Defaults to the page's own origin. */
  baseUrl?: string;
  fetchFn?: typeof fetch;
};

export type ApiClient = {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  delete<T = void>(path: string): Promise<T>;
  /** Forget the cached CSRF token so the next write fetches a fresh session. */
  resetSession(): void;
};

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const fetchFn = options.fetchFn ?? ((input, init) => globalThis.fetch(input, init));
  let csrfToken: Promise<string> | null = null;

  function toUrl(path: string): string {
    return new URL(path, options.baseUrl ?? window.location.origin).toString();
  }

  async function send(method: HttpMethod, path: string, headers: Headers, body?: unknown) {
    try {
      return await fetchFn(toUrl(path), {
        method,
        headers,
        credentials: "same-origin",
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (_error) {
      throw new ApiError(0, CLIENT_ERROR_CODE.serverUnreachable);
    }
  }

  async function toApiError(response: Response): Promise<ApiError> {
    try {
      const body = (await response.json()) as Partial<ApiErrorBody>;
      const code = body.error?.code;
      if (typeof code === "string") {
        return new ApiError(response.status, code, body.error?.details ?? {});
      }
    } catch (_error) {
      // Not JSON: fall through to a generic error.
    }
    return new ApiError(response.status, CLIENT_ERROR_CODE.invalidResponse);
  }

  async function fetchCsrfToken(): Promise<string> {
    const response = await send("GET", SESSION_PATH, new Headers({ accept: "application/json" }));
    if (!response.ok) throw await toApiError(response);
    const session = (await response.json()) as SessionResponse;
    return session.csrfToken;
  }

  function getCsrfToken(): Promise<string> {
    if (!csrfToken) {
      csrfToken = fetchCsrfToken();
      // Don't cache a failure: the next write tries again.
      csrfToken.catch(() => {
        csrfToken = null;
      });
    }
    return csrfToken;
  }

  async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const isWrite = WRITE_METHODS.has(method);

    const attempt = async (): Promise<Response> => {
      const headers = new Headers({ accept: "application/json" });
      if (body !== undefined) headers.set("content-type", "application/json");
      if (isWrite) headers.set(CSRF_HEADER, await getCsrfToken());
      return send(method, path, headers, body);
    };

    let response = await attempt();
    if (!response.ok) {
      let error = await toApiError(response);
      // The token may be stale (e.g. the server restarted). Refresh the session and retry once.
      if (isWrite && error.status === 403 && error.code === FORBIDDEN_REQUEST) {
        csrfToken = null;
        response = await attempt();
        if (!response.ok) {
          error = await toApiError(response);
          throw error;
        }
      } else {
        throw error;
      }
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (text === "") return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch (_error) {
      throw new ApiError(response.status, CLIENT_ERROR_CODE.invalidResponse);
    }
  }

  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    delete: (path) => request("DELETE", path),
    resetSession: () => {
      csrfToken = null;
    },
  };
}

/** The app-wide client. Tests reset its session between cases. */
export const apiClient = createApiClient();
