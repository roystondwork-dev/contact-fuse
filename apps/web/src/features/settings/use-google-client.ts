import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client.ts";
import type { GoogleClientInput, GoogleClientSettings } from "../../lib/api-types.ts";
import { apiPaths, queryKeys } from "../../lib/query-keys.ts";

export function useGoogleClientQuery() {
  return useQuery({
    queryKey: queryKeys.googleClient,
    queryFn: () => apiClient.get<GoogleClientSettings>(apiPaths.googleClient),
  });
}

export function useSaveGoogleClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GoogleClientInput) =>
      apiClient.put<GoogleClientSettings>(apiPaths.googleClient, input),
    onSuccess: (settings) => {
      // The response never contains the secret.
      queryClient.setQueryData(queryKeys.googleClient, settings);
    },
  });
}

export function useRemoveGoogleClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete(apiPaths.googleClient),
    onSuccess: () => {
      queryClient.setQueryData<GoogleClientSettings>(queryKeys.googleClient, {
        configured: false,
      });
    },
  });
}
