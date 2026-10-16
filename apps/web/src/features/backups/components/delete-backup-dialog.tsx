import { LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorAlert } from "../../../components/error-alert.tsx";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog.tsx";
import { Button } from "../../../components/ui/button.tsx";
import type { Snapshot } from "../../../lib/api-types.ts";
import { CONTACT_NOUN, formatCount, formatDateTime } from "../../../lib/format.ts";
import { useDeleteSnapshot } from "../use-snapshots.ts";

type DeleteBackupDialogProps = { snapshot: Snapshot };

export function DeleteBackupDialog({ snapshot }: DeleteBackupDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const deleteSnapshot = useDeleteSnapshot();
  const date = formatDateTime(snapshot.createdAt);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) deleteSnapshot.reset();
  };

  const handleDelete = () => {
    deleteSnapshot.mutate(snapshot.id, {
      onSuccess: () => {
        setIsOpen(false);
        toast.success("Backup deleted.");
      },
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Delete backup from ${date}`}>
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete the backup from {date}?</AlertDialogTitle>
          <AlertDialogDescription>
            {snapshot.status === "completed"
              ? `This backup of ${formatCount(snapshot.contactCount, CONTACT_NOUN).toLowerCase()} will be deleted from this computer. `
              : "This backup will be deleted from this computer. "}
            This can&rsquo;t be undone. Nothing in Google will change.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteSnapshot.isError ? <ErrorAlert error={deleteSnapshot.error} /> : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteSnapshot.isPending}>
            {deleteSnapshot.isPending ? (
              <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
            Delete backup
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
