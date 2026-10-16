import { CircleUserRound, Info } from "lucide-react";
import { Link } from "react-router";
import { EmptyState } from "../components/empty-state.tsx";
import { ErrorAlert } from "../components/error-alert.tsx";
import { PageHeader } from "../components/page-header.tsx";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";
import { AccountList } from "../features/accounts/components/account-list.tsx";
import { ConnectAccountPanel } from "../features/accounts/components/connect-account-panel.tsx";
import { useConnectFlow } from "../features/accounts/use-connect-flow.ts";
import { useGoogleClientQuery } from "../features/settings/use-google-client.ts";

export function AccountsPage() {
  const flow = useConnectFlow();
  const googleClient = useGoogleClientQuery();
  // The connect flow owns the accounts query (it polls while sign-in is pending).
  const accounts = flow.accounts;
  const isClientMissing = googleClient.data?.configured === false;
  const canConnect = googleClient.data?.configured === true && accounts.isSuccess;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Accounts"
        description="The Google accounts contact-fuse can read. Connect each account whose contacts you want to tidy up."
      />

      {isClientMissing ? (
        <Alert variant="info">
          <Info aria-hidden="true" />
          <AlertTitle>Set up Google first</AlertTitle>
          <AlertDescription>
            <p>
              contact-fuse needs your own Google client before it can connect accounts.{" "}
              <Link
                to="/settings"
                className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                Set up Google in Settings
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      <ConnectAccountPanel flow={flow} canConnect={canConnect} />

      <section aria-labelledby="accounts-list-title" className="flex flex-col gap-4">
        <h2 id="accounts-list-title" className="text-xl font-semibold">
          Your accounts
        </h2>
        {accounts.isPending ? (
          <div role="status" aria-label="Loading accounts" className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        ) : accounts.isError ? (
          <ErrorAlert error={accounts.error} onRetry={() => void accounts.refetch()} />
        ) : accounts.data.length === 0 ? (
          <EmptyState
            icon={CircleUserRound}
            title="No accounts yet"
            description="Connect a Google account to get started. You can add as many as you like."
          />
        ) : (
          <AccountList
            accounts={accounts.data}
            onReconnect={(account) => flow.start(account.includesOtherContacts)}
            isReconnectDisabled={!canConnect || flow.isStarting || flow.isWaiting}
          />
        )}
      </section>
    </div>
  );
}
