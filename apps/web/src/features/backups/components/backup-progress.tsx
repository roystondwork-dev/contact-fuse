import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { ErrorAlert } from "../../../components/error-alert.tsx";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert.tsx";
import { Skeleton } from "../../../components/ui/skeleton.tsx";
import type { SnapshotStatus } from "../../../lib/api-types.ts";
import { ACCOUNT_NOUN, CONTACT_NOUN, formatCount, formatNumber } from "../../../lib/format.ts";
import { queryKeys } from "../../../lib/query-keys.ts";
import { useSnapshotQuery } from "../use-snapshots.ts";

type BackupProgressProps = { snapshotId: string };

/** Live progress for a running backup (polled every second) and its outcome. */
export function BackupProgress({ snapshotId }: BackupProgressProps) {
  const queryClient = useQueryClient();
  const query = useSnapshotQuery(snapshotId);
  const status = query.data?.status;
  const previousStatus = useRef<SnapshotStatus | undefined>(status);

  useEffect(() => {
    const wasRunning = previousStatus.current === "running";
    previousStatus.current = status;
    if (!wasRunning || status === undefined || status === "running") return;
    // Finished: refresh the list, and accounts (a failure can mark one as needing sign-in).
    void queryClient.invalidateQueries({ queryKey: queryKeys.snapshots, exact: true });
    void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    if (status === "completed") toast.success("Backup saved.");
  }, [status, queryClient]);

  if (query.isPending) {
    return (
      <div role="status" aria-label="Loading backup progress">
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return <ErrorAlert error={query.error} onRetry={() => void query.refetch()} />;
  }

  const snapshot = query.data;

  if (snapshot.status === "failed") {
    return <ErrorAlert code={snapshot.errorCode ?? "INTERNAL_ERROR"} />;
  }

  if (snapshot.status === "completed") {
    return (
      <Alert variant="success">
        <CircleCheck aria-hidden="true" />
        <AlertTitle>Backup saved</AlertTitle>
        <AlertDescription>
          <p>
            {formatCount(snapshot.contactCount, CONTACT_NOUN)} from{" "}
            {formatCount(snapshot.accountCount, ACCOUNT_NOUN).toLowerCase()}.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  const fetched = snapshot.progress?.fetched ?? 0;
  return (
    <Alert variant="info">
      <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
      <AlertTitle role="status">Backing up your contacts…</AlertTitle>
      <AlertDescription>
        <p className="tabular-nums">
          {formatNumber(fetched)} {fetched === 1 ? "contact" : "contacts"} fetched so far
        </p>
        <p className="text-text-muted">
          You can leave this page. The backup keeps going and nothing in Google is changed.
        </p>
      </AlertDescription>
    </Alert>
  );
}
