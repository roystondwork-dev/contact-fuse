import { Download, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table.tsx";
import type { ExportFormat, Snapshot } from "../../../lib/api-types.ts";
import { getErrorCopy } from "../../../lib/error-copy.ts";
import {
  ACCOUNT_NOUN,
  CONTACT_NOUN,
  formatCount,
  formatDateTime,
  formatNumber,
} from "../../../lib/format.ts";
import { apiPaths } from "../../../lib/query-keys.ts";
import { DeleteBackupDialog } from "./delete-backup-dialog.tsx";
import { SnapshotStatusBadge } from "./snapshot-status-badge.tsx";

const EXPORTS: { format: ExportFormat; label: string }[] = [
  { format: "vcf", label: "Export as vCard" },
  { format: "csv", label: "Export as CSV" },
];

type BackupListProps = { snapshots: Snapshot[] };

/** Backups, newest first (the server returns them in that order). */
export function BackupList({ snapshots }: BackupListProps) {
  const hasExportable = snapshots.some((snapshot) => snapshot.status === "completed");

  return (
    <div className="flex flex-col gap-4">
      {hasExportable ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Exported files contain personal details</AlertTitle>
          <AlertDescription>
            <p>
              They include your contacts&rsquo; names, phone numbers and emails. Keep them somewhere
              safe and delete them when you no longer need them.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
      <ul aria-label="Backups" className="flex flex-col gap-4">
        {snapshots.map((snapshot) => {
          const date = formatDateTime(snapshot.createdAt);
          return (
            <li
              key={snapshot.id}
              className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold">
                  <time dateTime={snapshot.createdAt}>{date}</time>
                </h3>
                <SnapshotStatusBadge status={snapshot.status} />
              </div>

              {snapshot.status === "completed" ? (
                <>
                  <p className="text-sm text-text-muted tabular-nums">
                    {formatCount(snapshot.contactCount, CONTACT_NOUN)} ·{" "}
                    {formatCount(snapshot.accountCount, ACCOUNT_NOUN)}
                  </p>
                  {snapshot.accounts.length > 0 ? (
                    <Table>
                      <TableCaption>Contacts per account in the backup from {date}</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col">Account</TableHead>
                          <TableHead scope="col" className="text-right">
                            Contacts
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {snapshot.accounts.map((account) => (
                          <TableRow key={account.accountId}>
                            <TableCell className="break-all">{account.email}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatNumber(account.contactCount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : null}
                </>
              ) : snapshot.status === "failed" ? (
                <p className="text-sm text-text-muted">
                  {getErrorCopy(snapshot.errorCode ?? "INTERNAL_ERROR").title}. Nothing in Google
                  was changed.
                </p>
              ) : (
                <p className="text-sm text-text-muted">This backup is still running.</p>
              )}

              {snapshot.status === "running" ? null : (
                <div className="flex flex-wrap gap-2">
                  {snapshot.status === "completed"
                    ? EXPORTS.map(({ format, label }) => (
                        <Button key={format} asChild variant="secondary" size="sm">
                          <a
                            href={apiPaths.snapshotExport(snapshot.id, format)}
                            download
                            aria-label={`${label}: backup from ${date}`}
                          >
                            <Download aria-hidden="true" />
                            {label}
                          </a>
                        </Button>
                      ))
                    : null}
                  <DeleteBackupDialog snapshot={snapshot} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
