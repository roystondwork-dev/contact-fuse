// API shapes mirrored from docs/architecture/http-api.md. The web app talks to the server over
// HTTP only and never imports runtime code from other packages, so these are kept in sync by hand.

export type ListResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type SessionResponse = {
  csrfToken: string;
};

export type GoogleClientSettings = {
  configured: boolean;
  clientId?: string;
};

export type GoogleClientInput = {
  clientId: string;
  clientSecret: string;
};

export const ACCOUNT_STATUS = {
  connected: "connected",
  needsReauth: "needs-reauth",
  disconnected: "disconnected",
} as const;

export type AccountStatus = (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];

export type Account = {
  id: string;
  provider: "google";
  email: string;
  displayName?: string;
  isMain: boolean;
  status: AccountStatus;
  includesOtherContacts: boolean;
  lastSyncedAt?: string;
  createdAt: string;
};

export type ConnectAccountInput = {
  provider: "google";
  includeOtherContacts?: boolean;
};

export type ConnectAccountResponse = {
  authorizationUrl: string;
};

export const SNAPSHOT_STATUS = {
  running: "running",
  completed: "completed",
  failed: "failed",
} as const;

export type SnapshotStatus = (typeof SNAPSHOT_STATUS)[keyof typeof SNAPSHOT_STATUS];

export type SnapshotAccount = {
  accountId: string;
  email: string;
  contactCount: number;
};

export type Snapshot = {
  id: string;
  status: SnapshotStatus;
  contactCount: number;
  accountCount: number;
  errorCode?: string;
  createdAt: string;
  completedAt?: string;
  accounts: SnapshotAccount[];
  progress?: { fetched: number };
};

export type ExportFormat = "vcf" | "csv";
