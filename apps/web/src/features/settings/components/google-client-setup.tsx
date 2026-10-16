import { CircleCheck, ExternalLink, KeyRound, LoaderCircle, Trash2 } from "lucide-react";
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
import { Badge } from "../../../components/ui/badge.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.tsx";
import { Skeleton } from "../../../components/ui/skeleton.tsx";
import { GOOGLE_SETUP_GUIDE_URL } from "../../../lib/utils.ts";
import { useGoogleClientQuery, useRemoveGoogleClient } from "../use-google-client.ts";
import { GoogleClientForm } from "./google-client-form.tsx";

/** Google OAuth client card, used on first run and in Settings. */
export function GoogleClientSetup() {
  const query = useGoogleClientQuery();
  const remove = useRemoveGoogleClient();
  const [isReplacing, setIsReplacing] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

  const handleRemove = () => {
    remove.mutate(undefined, {
      onSuccess: () => {
        setIsRemoveOpen(false);
        setIsReplacing(false);
        toast.success("Google client removed.");
      },
    });
  };

  return (
    <Card aria-labelledby="google-client-title">
      <CardHeader>
        <CardTitle id="google-client-title" className="flex items-center gap-2">
          <KeyRound aria-hidden="true" className="size-5 text-text-muted" />
          Connect contact-fuse to Google
        </CardTitle>
        <CardDescription>
          Google needs you to create a free &ldquo;OAuth client&rdquo; so this app can read your
          contacts. It takes about 5 minutes.
        </CardDescription>
        <a
          href={GOOGLE_SETUP_GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          Open the step-by-step guide
          <ExternalLink aria-hidden="true" className="size-4" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div
            role="status"
            aria-label="Loading Google client settings"
            className="flex flex-col gap-3"
          >
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full max-w-xl" />
          </div>
        ) : query.isError ? (
          <ErrorAlert error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.configured && !isReplacing ? (
          <div className="flex flex-col gap-4">
            <Badge variant="success" className="w-fit">
              <CircleCheck aria-hidden="true" />
              Saved
            </Badge>
            <dl className="grid gap-2 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-4">
              <dt className="font-semibold">Client ID</dt>
              <dd className="font-mono text-[13px] break-all">{query.data.clientId}</dd>
              <dt className="font-semibold">Client secret</dt>
              <dd className="text-text-muted">Saved in your keychain (hidden)</dd>
            </dl>
            {remove.isError ? <ErrorAlert error={remove.error} /> : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setIsReplacing(true)}>
                Replace
              </Button>
              <AlertDialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost">
                    <Trash2 aria-hidden="true" />
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove the Google client?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You won&rsquo;t be able to connect or reconnect accounts until you add a
                      client again. Your backups are kept and nothing in Google will change.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={handleRemove}
                      disabled={remove.isPending}
                    >
                      {remove.isPending ? (
                        <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
                      ) : (
                        <Trash2 aria-hidden="true" />
                      )}
                      Remove client
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <GoogleClientForm
            onSaved={() => setIsReplacing(false)}
            {...(isReplacing ? { onCancel: () => setIsReplacing(false) } : {})}
          />
        )}
      </CardContent>
    </Card>
  );
}
