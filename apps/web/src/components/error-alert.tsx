import { CircleAlert, RefreshCw } from "lucide-react";
import { getErrorCode, getErrorCopy } from "../lib/error-copy.ts";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert.tsx";
import { Button } from "./ui/button.tsx";

type ErrorAlertProps = {
  /** A thrown error (usually an ApiError)… */
  error?: unknown;
  /** …or an error code from a resource, such as a failed backup's `errorCode`. */
  code?: string | undefined;
  /** Shown as a "Try again" button when given. */
  onRetry?: () => void;
  className?: string;
};

/**
 * Inline error: what happened, what to do, and whether the user's contacts are safe.
 * Copy comes from the error code. The server's message is never shown.
 */
export function ErrorAlert({ error, code: codeProp, onRetry, className }: ErrorAlertProps) {
  const code = codeProp ?? getErrorCode(error);
  const copy = getErrorCopy(code);

  const copyDetails = async () => {
    // Only the code and app details: never contact data or emails.
    const details = `Error code: ${code}\nApp: contact-fuse web\nBrowser: ${navigator.userAgent}`;
    try {
      await navigator.clipboard.writeText(details);
    } catch (_error) {
      // Clipboard access can be denied; the code is still visible below.
    }
  };

  return (
    <Alert variant="danger" role="alert" className={className}>
      <CircleAlert aria-hidden="true" />
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription>
        <p>{copy.description}</p>
        <p>
          <strong className="font-semibold">Are my contacts safe? </strong>
          {copy.safety}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <RefreshCw aria-hidden="true" />
              Try again
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={copyDetails}>
            Copy details
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
