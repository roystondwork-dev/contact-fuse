import { Archive, LoaderCircle } from "lucide-react";
import { useId } from "react";
import { Button } from "../../../components/ui/button.tsx";

type CreateBackupButtonProps = {
  hasConnectedAccount: boolean;
  isRunning: boolean;
  isStarting: boolean;
  onCreate: () => void;
};

/** The Backups page's primary action, with the reason when it is disabled. */
export function CreateBackupButton({
  hasConnectedAccount,
  isRunning,
  isStarting,
  onCreate,
}: CreateBackupButtonProps) {
  const reasonId = useId();
  const reason = !hasConnectedAccount
    ? "Connect at least one account to create a backup."
    : isRunning
      ? "A backup is already running."
      : undefined;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        size="lg"
        onClick={onCreate}
        disabled={reason !== undefined || isStarting}
        aria-describedby={reason ? reasonId : undefined}
      >
        {isStarting ? (
          <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
        ) : (
          <Archive aria-hidden="true" />
        )}
        Create backup
      </Button>
      {reason ? (
        <p id={reasonId} className="text-sm text-text-muted">
          {reason}
        </p>
      ) : null}
    </div>
  );
}
