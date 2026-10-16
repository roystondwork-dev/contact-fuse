import { LoaderCircle, Trash2, TriangleAlert } from "lucide-react";
import { useId, useRef, useState } from "react";
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
import { Input } from "../../../components/ui/input.tsx";
import { Label } from "../../../components/ui/label.tsx";
import { DELETE_CONFIRMATION, useDeleteLocalData } from "../use-delete-local-data.ts";

type DeleteLocalDataSectionProps = {
  onDeleted: () => void;
};

/** Settings danger zone: delete everything contact-fuse stored on this computer. */
export function DeleteLocalDataSection({ onDeleted }: DeleteLocalDataSectionProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const deleteLocalData = useDeleteLocalData();
  const isConfirmed = confirmation === DELETE_CONFIRMATION;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setConfirmation("");
      deleteLocalData.reset();
    }
  };

  const handleDelete = () => {
    if (!isConfirmed) return;
    deleteLocalData.mutate(undefined, {
      onSuccess: () => {
        setIsOpen(false);
        onDeleted();
      },
    });
  };

  return (
    <section
      aria-labelledby="danger-zone-title"
      className="flex flex-col gap-4 rounded-md border border-danger p-4 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="danger-zone-title" className="flex items-center gap-2 text-base font-semibold">
          <TriangleAlert aria-hidden="true" className="size-5 text-danger" />
          Danger zone
        </h2>
        <p className="max-w-prose text-sm text-text-muted">
          Delete all local data removes your backups, connected accounts, saved sign-ins and
          settings from this computer. Nothing in your Google accounts will change.
        </p>
      </div>
      <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-fit">
            <Trash2 aria-hidden="true" />
            Delete all local data
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent
          onOpenAutoFocus={(event) => {
            // Type-to-confirm dialogs start on the input, never on the destructive button.
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all local data?</AlertDialogTitle>
            <AlertDialogDescription>
              All backups, connected accounts, saved sign-ins and settings will be deleted from this
              computer. This can&rsquo;t be undone. Your contacts in Google stay as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleDelete();
            }}
          >
            <Label htmlFor={inputId}>
              Type <span className="font-mono">{DELETE_CONFIRMATION}</span> to confirm
            </Label>
            <Input
              id={inputId}
              ref={inputRef}
              autoComplete="off"
              spellCheck={false}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            {deleteLocalData.isError ? <ErrorAlert error={deleteLocalData.error} /> : null}
            <AlertDialogFooter className="mt-2">
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={!isConfirmed || deleteLocalData.isPending}
              >
                {deleteLocalData.isPending ? (
                  <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
                ) : (
                  <Trash2 aria-hidden="true" />
                )}
                Delete all local data
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
