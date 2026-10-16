import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client.ts";
import { apiPaths } from "../../lib/query-keys.ts";

export const DELETE_CONFIRMATION = "DELETE";

export function useDeleteLocalData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<void>(apiPaths.deleteLocalData, { confirm: DELETE_CONFIRMATION }),
    onSuccess: () => {
      // Everything cached is now stale: settings, accounts and backups are gone.
      queryClient.removeQueries();
    },
  });
}
