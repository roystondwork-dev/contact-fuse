import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client.ts";
import type {
  Account,
  ConnectAccountInput,
  ConnectAccountResponse,
  ListResponse,
} from "../../lib/api-types.ts";
import { apiPaths, queryKeys } from "../../lib/query-keys.ts";

type AccountsQueryOptions = {
  /** Poll interval in ms (or false), decided from the latest accounts. */
  refetchInterval?: (accounts: Account[] | undefined) => number | false;
};

export function useAccountsQuery(options: AccountsQueryOptions = {}) {
  const { refetchInterval } = options;
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => apiClient.get<ListResponse<Account>>(apiPaths.accounts),
    select: (data) => data.items,
    refetchInterval: refetchInterval ? (query) => refetchInterval(query.state.data?.items) : false,
    // While polling, the user is usually in another tab (Google sign-in), so keep going.
    refetchIntervalInBackground: true,
  });
}

export function useConnectAccount() {
  return useMutation({
    mutationFn: (input: ConnectAccountInput) =>
      apiClient.post<ConnectAccountResponse>(apiPaths.connectAccount, input),
  });
}

export function useDisconnectAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => apiClient.delete(apiPaths.account(accountId)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
  });
}
