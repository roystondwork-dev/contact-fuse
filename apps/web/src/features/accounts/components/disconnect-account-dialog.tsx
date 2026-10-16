import { LoaderCircle, Unplug } from "lucide-react";
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
import type { Account } from "../../../lib/api-types.ts";
import { useDisconnectAccount } from "../use-accounts.ts";

type DisconnectAccountDialogProps = { account: Account };

export function DisconnectAccountDialog({ account }: DisconnectAccountDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const disconnect = useDisconnectAccount();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) disconnect.reset();
  };

  const handleDisconnect = () => {
    disconnect.mutate(account.id, {
      onSuccess: () => {
        setIsOpen(false);
        toast.success(`Disconnected ${account.email}.`);
      },
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Disconnect ${account.email}`}>
          <Unplug aria-hidden="true" />
          Disconnect
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect {account.email}?</AlertDialogTitle>
          <AlertDialogDescription>
            contact-fuse will stop accessing this account and forget its sign-in. Your backups of it
            are kept, and nothing in Google will change. You can reconnect it at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {disconnect.isError ? <ErrorAlert error={disconnect.error} /> : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDisconnect} disabled={disconnect.isPending}>
            {disconnect.isPending ? (
              <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
            ) : (
              <Unplug aria-hidden="true" />
            )}
            Disconnect account
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
