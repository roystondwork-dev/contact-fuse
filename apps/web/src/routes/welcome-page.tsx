import { ArrowRight, CircleCheck, Lock } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { PAGE_TITLE_ID } from "../components/page-header.tsx";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert.tsx";
import { Button } from "../components/ui/button.tsx";
import { GoogleClientSetup } from "../features/settings/components/google-client-setup.tsx";
import { useGoogleClientQuery } from "../features/settings/use-google-client.ts";
import type { WelcomeLocationState } from "./settings-page.tsx";

/** First run: what contact-fuse does, the privacy promise, and the Google client setup. */
export function WelcomePage() {
  const location = useLocation();
  const state = location.state as WelcomeLocationState | null;
  const googleClient = useGoogleClientQuery();

  useEffect(() => {
    document.title = "Welcome – contact-fuse";
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      {state?.isLocalDataDeleted ? (
        <Alert variant="success" role="status">
          <CircleCheck aria-hidden="true" />
          <AlertTitle>All local data was deleted</AlertTitle>
          <AlertDescription>
            <p>
              Backups, accounts, sign-ins and settings are gone from this computer. Your contacts in
              Google were not changed.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3">
        <h1
          id={PAGE_TITLE_ID}
          tabIndex={-1}
          className="text-3xl font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          Tidy up your contacts
        </h1>
        <p className="max-w-prose text-base text-text-muted">
          contact-fuse finds the same people across your Google accounts and merges them into one
          list. Everything runs on this computer.
        </p>
        <p className="flex items-center gap-2 text-base font-semibold">
          <Lock aria-hidden="true" className="size-5 text-primary" />
          Your contacts stay on this computer. They are never uploaded anywhere.
        </p>
      </div>

      <GoogleClientSetup />

      {googleClient.data?.configured ? (
        <Button asChild size="lg" className="w-fit">
          <Link to="/accounts">
            Continue to accounts
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
