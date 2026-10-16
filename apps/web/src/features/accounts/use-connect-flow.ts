import { useEffect, useState } from "react";
import type { Account } from "../../lib/api-types.ts";
import { useAccountsQuery, useConnectAccount } from "./use-accounts.ts";

/** How often to check for the new account while sign-in is pending. */
export const CONNECT_POLL_INTERVAL_MS = 3_000;
/** Stop checking after this long; the user can check again manually. */
export const CONNECT_TIMEOUT_MS = 5 * 60_000;

type Baseline = Record<string, string>;

type ConnectPhase =
  | { kind: "idle" }
  | { kind: "waiting"; baseline: Baseline; authorizationUrl: string; isTabBlocked: boolean }
  | { kind: "timed-out"; baseline: Baseline; authorizationUrl: string };

/** Fields that change when an account is added or reconnected. */
function fingerprint(account: Account): string {
  return JSON.stringify([
    account.status,
    account.includesOtherContacts,
    account.email,
    account.displayName ?? null,
    account.lastSyncedAt ?? null,
  ]);
}

function toBaseline(accounts: Account[]): Baseline {
  return Object.fromEntries(accounts.map((account) => [account.id, fingerprint(account)]));
}

/** The first account that is new or changed since the connect started. */
export function findConnectedAccount(baseline: Baseline, accounts: Account[]): Account | undefined {
  return accounts.find(
    (account) => account.status === "connected" && baseline[account.id] !== fingerprint(account),
  );
}

function openInNewTab(url: string): boolean {
  const tab = window.open(url, "_blank");
  if (!tab) return false;
  try {
    // Don't give Google's page a handle back to this window.
    tab.opener = null;
  } catch (_error) {
    // Already cross-origin (or severed by the server's COOP header): nothing to clear.
  }
  return true;
}

/**
 * The "Connect Google account" flow: ask the server for an authorization URL, open it in a new
 * tab, then poll the account list (every 3 s and on window focus) until a new or reconnected
 * account appears, giving up after 5 minutes.
 */
export function useConnectFlow() {
  const [phase, setPhase] = useState<ConnectPhase>({ kind: "idle" });
  const connect = useConnectAccount();
  const accounts = useAccountsQuery({
    refetchInterval: (latest) =>
      phase.kind === "waiting" && !(latest && findConnectedAccount(phase.baseline, latest))
        ? CONNECT_POLL_INTERVAL_MS
        : false,
  });

  const connectedAccount =
    phase.kind !== "idle" && accounts.data
      ? findConnectedAccount(phase.baseline, accounts.data)
      : undefined;
  const isWaiting = phase.kind === "waiting" && !connectedAccount;
  const { refetch } = accounts;

  useEffect(() => {
    if (!isWaiting) return;
    const timer = window.setTimeout(() => {
      setPhase((current) =>
        current.kind === "waiting"
          ? {
              kind: "timed-out",
              baseline: current.baseline,
              authorizationUrl: current.authorizationUrl,
            }
          : current,
      );
    }, CONNECT_TIMEOUT_MS);
    const handleFocus = () => void refetch();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isWaiting, refetch]);

  const start = (includeOtherContacts: boolean) => {
    const baseline = toBaseline(accounts.data ?? []);
    connect.mutate(
      { provider: "google", includeOtherContacts },
      {
        onSuccess: ({ authorizationUrl }) => {
          const isOpened = openInNewTab(authorizationUrl);
          setPhase({ kind: "waiting", baseline, authorizationUrl, isTabBlocked: !isOpened });
        },
      },
    );
  };

  const checkAgain = () => {
    if (phase.kind !== "timed-out") return;
    setPhase({
      kind: "waiting",
      baseline: phase.baseline,
      authorizationUrl: phase.authorizationUrl,
      isTabBlocked: false,
    });
    void refetch();
  };

  const reset = () => {
    connect.reset();
    setPhase({ kind: "idle" });
  };

  return {
    accounts,
    phase,
    isWaiting,
    isTimedOut: phase.kind === "timed-out" && !connectedAccount,
    connectedAccount,
    isStarting: connect.isPending,
    startError: connect.error,
    start,
    checkAgain,
    reset,
  };
}

export type ConnectFlow = ReturnType<typeof useConnectFlow>;
