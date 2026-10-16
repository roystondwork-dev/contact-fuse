import { isApiError } from "./api-client.ts";

/**
 * What the UI says for each error code (docs/design/content-style-guide.md#errors).
 * The server's `message` is never shown. Every entry answers "Are my contacts safe?".
 */
export type ErrorCopy = {
  title: string;
  description: string;
  safety: string;
};

const SAFE_NOTHING_CHANGED = "Yes. Nothing in your Google accounts was changed.";

const ERROR_COPY: Record<string, ErrorCopy> = {
  SERVER_UNREACHABLE: {
    title: "Can't reach contact-fuse",
    description:
      "The app on this computer isn't responding. Check that it's still running in your terminal, then try again.",
    safety: SAFE_NOTHING_CHANGED,
  },
  NETWORK_ERROR: {
    title: "Can't reach Google",
    description: "Check your internet connection and try again.",
    safety: SAFE_NOTHING_CHANGED,
  },
  FORBIDDEN_REQUEST: {
    title: "This request was blocked",
    description:
      "contact-fuse only accepts requests from its own page. Reload the page and try again.",
    safety: SAFE_NOTHING_CHANGED,
  },
  VALIDATION_FAILED: {
    title: "Some details aren't right",
    description: "Check the highlighted fields and try again.",
    safety: SAFE_NOTHING_CHANGED,
  },
  OAUTH_CLIENT_MISSING: {
    title: "Google isn't set up yet",
    description: "Add your Google client ID and secret in Settings, then try again.",
    safety: SAFE_NOTHING_CHANGED,
  },
  AUTH_REQUIRED: {
    title: "No connected accounts",
    description: "Connect a Google account, then try again.",
    safety: SAFE_NOTHING_CHANGED,
  },
  RUN_IN_PROGRESS: {
    title: "A backup is already running",
    description: "Wait for it to finish, then try again.",
    safety: "Yes. The running backup keeps going and nothing in Google was changed.",
  },
  SNAPSHOT_INCOMPLETE: {
    title: "This backup isn't finished",
    description: "Only completed backups can be exported. Wait for it to finish, then try again.",
    safety: SAFE_NOTHING_CHANGED,
  },
  NOT_FOUND: {
    title: "This item no longer exists",
    description: "It may have been deleted. Refresh the page to see the latest list.",
    safety: SAFE_NOTHING_CHANGED,
  },
  ACCOUNT_NOT_FOUND: {
    title: "This account is no longer connected",
    description: "Refresh the page to see the latest list of accounts.",
    safety: SAFE_NOTHING_CHANGED,
  },
  TOKEN_EXPIRED: {
    title: "Your Google sign-in has expired",
    description:
      "Google does this every 7 days for test apps. Reconnect the account on the Accounts page, then try again.",
    safety: SAFE_NOTHING_CHANGED,
  },
  OAUTH_TOKEN_EXPIRED: {
    title: "Your Google sign-in has expired",
    description:
      "Google does this every 7 days for test apps. Reconnect the account on the Accounts page, then try again.",
    safety: SAFE_NOTHING_CHANGED,
  },
  OAUTH_CANCELLED: {
    title: "Sign-in was cancelled",
    description: "You can try again whenever you're ready.",
    safety: SAFE_NOTHING_CHANGED,
  },
  OAUTH_INVALID_CLIENT: {
    title: "Google didn't accept the client ID or secret",
    description: "Check them in Settings, or follow the setup guide again.",
    safety: SAFE_NOTHING_CHANGED,
  },
  OAUTH_ACCESS_DENIED: {
    title: "Google blocked this sign-in",
    description: "Add this email as a test user in your Google Cloud project, then try again.",
    safety: SAFE_NOTHING_CHANGED,
  },
  GOOGLE_RATE_LIMITED: {
    title: "Google asked us to slow down",
    description: "Wait a minute, then try again.",
    safety: SAFE_NOTHING_CHANGED,
  },
};

const UNKNOWN_ERROR_COPY: ErrorCopy = {
  title: "Something unexpected happened",
  description:
    "Try again. If it keeps happening, copy the details and include them in a bug report.",
  safety: "Yes. Nothing more was changed.",
};

/** Copy for an error code, falling back to the generic message for unknown codes. */
export function getErrorCopy(code: string): ErrorCopy {
  return ERROR_COPY[code] ?? UNKNOWN_ERROR_COPY;
}

/** The error code for any thrown value. Unknown errors map to INTERNAL_ERROR. */
export function getErrorCode(error: unknown): string {
  return isApiError(error) ? error.code : "INTERNAL_ERROR";
}
