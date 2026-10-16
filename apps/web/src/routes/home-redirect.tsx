import { Navigate } from "react-router";
import { ErrorAlert } from "../components/error-alert.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";
import { useGoogleClientQuery } from "../features/settings/use-google-client.ts";

/** "/" goes to first-run setup until the Google client is configured, then to Accounts. */
export function HomeRedirect() {
  const googleClient = useGoogleClientQuery();

  if (googleClient.isPending) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (googleClient.isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">contact-fuse</h1>
        <ErrorAlert error={googleClient.error} onRetry={() => void googleClient.refetch()} />
      </div>
    );
  }
  return <Navigate to={googleClient.data.configured ? "/accounts" : "/welcome"} replace />;
}
