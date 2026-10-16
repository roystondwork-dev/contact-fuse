import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client.ts";
import type { ListResponse, Snapshot } from "../../lib/api-types.ts";
import { apiPaths, queryKeys } from "../../lib/query-keys.ts";

/** Poll a running backup this often (docs/architecture/http-api.md#snapshots-backups). */
export const SNAPSHOT_POLL_INTERVAL_MS = 1_000;

export function useSnapshotsQuery() {
  return useQuery({
    queryKey: queryKeys.snapshots,
    queryFn: () => apiClient.get<ListResponse<Snapshot>>(apiPaths.snapshots),
    select: (data) => data.items,
  });
}

/** One backup, polled every second while it is running. */
export function useSnapshotQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.snapshot(id),
    queryFn: () => apiClient.get<Snapshot>(apiPaths.snapshot(id)),
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? SNAPSHOT_POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: true,
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<Snapshot>(apiPaths.snapshots, {}),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(queryKeys.snapshot(snapshot.id), snapshot);
      void queryClient.invalidateQueries({ queryKey: queryKeys.snapshots, exact: true });
    },
    onError: () => {
      // e.g. RUN_IN_PROGRESS: show the backup that is already running.
      void queryClient.invalidateQueries({ queryKey: queryKeys.snapshots, exact: true });
    },
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(apiPaths.snapshot(id)),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.snapshot(id), exact: true });
      return queryClient.invalidateQueries({ queryKey: queryKeys.snapshots, exact: true });
    },
  });
}
