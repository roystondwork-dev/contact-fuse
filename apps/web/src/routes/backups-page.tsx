import { Archive } from "lucide-react";
import { EmptyState } from "../components/empty-state.tsx";
import { ErrorAlert } from "../components/error-alert.tsx";
import { PageHeader } from "../components/page-header.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";
import { useAccountsQuery } from "../features/accounts/use-accounts.ts";
import { BackupList } from "../features/backups/components/backup-list.tsx";
import { BackupProgress } from "../features/backups/components/backup-progress.tsx";
import { CreateBackupButton } from "../features/backups/components/create-backup-button.tsx";
import { useCreateSnapshot, useSnapshotsQuery } from "../features/backups/use-snapshots.ts";

export function BackupsPage() {
  const accounts = useAccountsQuery();
  const snapshots = useSnapshotsQuery();
  const createSnapshot = useCreateSnapshot();

  // Until accounts load, don't claim there are none (the server still answers AUTH_REQUIRED).
  const hasConnectedAccount = accounts.isSuccess
    ? accounts.data.some((account) => account.status === "connected")
    : true;
  const runningSnapshot = snapshots.data?.find((snapshot) => snapshot.status === "running");
  // The backup this page started, or one already running (e.g. after a reload).
  const activeSnapshotId = createSnapshot.data?.id ?? runningSnapshot?.id;
  // A running backup is shown by BackupProgress above the list, not in it.
  const listedSnapshots = snapshots.data?.filter((snapshot) => snapshot.status !== "running");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Backups"
        description="A backup is a copy of every contact in your connected accounts, saved on this computer. Nothing in Google changes."
        actions={
          <CreateBackupButton
            hasConnectedAccount={hasConnectedAccount}
            isRunning={runningSnapshot !== undefined}
            isStarting={createSnapshot.isPending}
            onCreate={() => createSnapshot.mutate()}
          />
        }
      />

      {createSnapshot.isError ? <ErrorAlert error={createSnapshot.error} /> : null}
      {activeSnapshotId ? (
        <BackupProgress key={activeSnapshotId} snapshotId={activeSnapshotId} />
      ) : null}

      <section aria-labelledby="backups-list-title" className="flex flex-col gap-4">
        <h2 id="backups-list-title" className="text-xl font-semibold">
          Your backups
        </h2>
        {snapshots.isPending ? (
          <div role="status" aria-label="Loading backups" className="flex flex-col gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : snapshots.isError ? (
          <ErrorAlert error={snapshots.error} onRetry={() => void snapshots.refetch()} />
        ) : listedSnapshots === undefined || listedSnapshots.length === 0 ? (
          activeSnapshotId ? null : (
            <EmptyState
              icon={Archive}
              title="No backups yet"
              description="Create a backup before you change anything. You can export it as a vCard or CSV file."
            />
          )
        ) : (
          <BackupList snapshots={listedSnapshots} />
        )}
      </section>
    </div>
  );
}
