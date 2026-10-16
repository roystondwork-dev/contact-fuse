import { CircleCheck, TriangleAlert, Unplug, type LucideIcon } from "lucide-react";
import { Badge, type BadgeProps } from "../../../components/ui/badge.tsx";
import type { AccountStatus } from "../../../lib/api-types.ts";

const STATUS: Record<
  AccountStatus,
  { label: string; icon: LucideIcon; variant: NonNullable<BadgeProps["variant"]> }
> = {
  connected: { label: "Connected", icon: CircleCheck, variant: "success" },
  "needs-reauth": { label: "Sign-in expired", icon: TriangleAlert, variant: "warning" },
  disconnected: { label: "Disconnected", icon: Unplug, variant: "neutral" },
};

type AccountStatusBadgeProps = { status: AccountStatus };

/** Account status: icon + text, never colour alone. */
export function AccountStatusBadge({ status }: AccountStatusBadgeProps) {
  const { label, icon: Icon, variant } = STATUS[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
