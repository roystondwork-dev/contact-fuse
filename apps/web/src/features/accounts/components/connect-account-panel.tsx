import { CircleCheck, Clock, ExternalLink, LoaderCircle, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { ErrorAlert } from "../../../components/error-alert.tsx";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert.tsx";
import { Button } from "../../../components/ui/button.tsx";
import { Label } from "../../../components/ui/label.tsx";
import { Switch } from "../../../components/ui/switch.tsx";
import type { ConnectFlow } from "../use-connect-flow.ts";

type ConnectAccountPanelProps = {
  flow: ConnectFlow;
  /** False until the Google client is set up; connecting would fail. */
  canConnect: boolean;
};

/** "Connect Google account" button, Other contacts switch, and the pending sign-in state. */
export function ConnectAccountPanel({ flow, canConnect }: ConnectAccountPanelProps) {
  const switchId = useId();
  const helperId = useId();
  const [includeOtherContacts, setIncludeOtherContacts] = useState(false);
  const { phase } = flow;
  const isBusy = flow.isStarting || flow.isWaiting;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-surface-muted p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Switch
            id={switchId}
            checked={includeOtherContacts}
            onCheckedChange={setIncludeOtherContacts}
            disabled={isBusy}
            aria-describedby={helperId}
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor={switchId}>Also include Other contacts</Label>
            <p id={helperId} className="max-w-prose text-sm text-text-muted">
              People you&rsquo;ve emailed but never saved. Google keeps them in a separate list.
            </p>
          </div>
        </div>
        <Button
          size="lg"
          onClick={() => flow.start(includeOtherContacts)}
          disabled={!canConnect || isBusy}
          aria-describedby={canConnect ? undefined : `${helperId}-disabled`}
        >
          {flow.isStarting ? (
            <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          Connect Google account
        </Button>
      </div>

      {canConnect ? null : (
        <p id={`${helperId}-disabled`} className="text-sm text-text-muted">
          Set up your Google client first.{" "}
          <Link
            to="/settings"
            className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            Go to Settings
          </Link>
        </p>
      )}

      {flow.startError ? <ErrorAlert error={flow.startError} /> : null}

      <div role="status" aria-live="polite">
        {flow.connectedAccount ? (
          <Alert variant="success">
            <CircleCheck aria-hidden="true" />
            <AlertTitle>Connected {flow.connectedAccount.email}</AlertTitle>
            <AlertDescription>
              <p>You can close the Google tab. Connect another account or create a backup.</p>
              <Button variant="ghost" size="sm" className="w-fit" onClick={flow.reset}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        ) : phase.kind === "waiting" ? (
          <Alert variant="info">
            <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
            <AlertTitle>Waiting for you to sign in to Google</AlertTitle>
            <AlertDescription>
              <p>
                {phase.isTabBlocked
                  ? "Your browser blocked the new tab. Open Google sign-in to continue."
                  : "Finish signing in in the new tab. This page updates by itself."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <a href={phase.authorizationUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" />
                    Open Google sign-in
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </Button>
                <Button variant="ghost" size="sm" onClick={flow.reset}>
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : flow.isTimedOut ? (
          <Alert variant="warning">
            <Clock aria-hidden="true" />
            <AlertTitle>We stopped checking for the new account</AlertTitle>
            <AlertDescription>
              <p>If you finished signing in, check again. Otherwise, start over.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={flow.checkAgain}>
                  Check again
                </Button>
                <Button variant="ghost" size="sm" onClick={flow.reset}>
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
