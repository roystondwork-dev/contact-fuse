import { CircleUserRound, RefreshCw, Star } from "lucide-react";
import { Badge } from "../../../components/ui/badge.tsx";
import { Button } from "../../../components/ui/button.tsx";
import { useNow } from "../../../hooks/use-now.ts";
import type { Account } from "../../../lib/api-types.ts";
import { formatDateTime, formatRelativeDateTime } from "../../../lib/format.ts";
import { AccountStatusBadge } from "./account-status-badge.tsx";
import { DisconnectAccountDialog } from "./disconnect-account-dialog.tsx";

type AccountListProps = {
  accounts: Account[];
  onReconnect: (account: Account) => void;
  isReconnectDisabled: boolean;
};

export function AccountList({ accounts, onReconnect, isReconnectDisabled }: AccountListProps) {
  const now = useNow();

  return (
    <ul aria-label="Google accounts" className="grid gap-4 sm:grid-cols-2">
      {accounts.map((account) => (
        <li
          key={account.id}
          className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
        >
          <div className="flex items-start gap-3">
            <CircleUserRound
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-text-muted"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-semibold break-all">{account.email}</p>
              {account.displayName ? (
                <p className="text-sm text-text-muted">{account.displayName}</p>
              ) : null}
              <p className="text-xs text-text-muted">
                Added{" "}
                <time dateTime={account.createdAt} title={formatDateTime(account.createdAt)}>
                  {formatRelativeDateTime(account.createdAt, now)}
                </time>
                {account.includesOtherContacts ? " · Includes Other contacts" : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AccountStatusBadge status={account.status} />
            {account.isMain ? (
              <Badge variant="primary">
                <Star aria-hidden="true" />
                Main account
              </Badge>
            ) : null}
          </div>
          {account.status === "needs-reauth" ? (
            <p className="text-sm text-text-muted">
              Google ended this sign-in. Reconnect to keep backing up this account.
            </p>
          ) : null}
          <div className="mt-auto flex flex-wrap gap-2">
            {account.status === "connected" ? (
              <DisconnectAccountDialog account={account} />
            ) : (
              <Button
                variant={account.status === "needs-reauth" ? "primary" : "secondary"}
                size="sm"
                disabled={isReconnectDisabled}
                onClick={() => onReconnect(account)}
                aria-label={`Reconnect ${account.email}`}
              >
                <RefreshCw aria-hidden="true" />
                Reconnect
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
