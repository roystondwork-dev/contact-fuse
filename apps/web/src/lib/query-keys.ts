/** TanStack Query keys. Every server resource has exactly one key factory here. */
export const queryKeys = {
  googleClient: ["settings", "google-client"] as const,
  accounts: ["accounts"] as const,
  snapshots: ["snapshots"] as const,
  snapshot: (id: string) => ["snapshots", id] as const,
};

/** Paths for the endpoints in docs/architecture/http-api.md. */
export const apiPaths = {
  googleClient: "/api/v1/settings/google-client",
  accounts: "/api/v1/accounts",
  connectAccount: "/api/v1/accounts/connect",
  account: (id: string) => `/api/v1/accounts/${encodeURIComponent(id)}`,
  snapshots: "/api/v1/snapshots",
  snapshot: (id: string) => `/api/v1/snapshots/${encodeURIComponent(id)}`,
  snapshotExport: (id: string, format: "vcf" | "csv") =>
    `/api/v1/snapshots/${encodeURIComponent(id)}/export?format=${format}`,
  deleteLocalData: "/api/v1/local-data/delete",
};
