import { CircleAlert, CircleCheck, LoaderCircle, type LucideIcon } from "lucide-react";
import { Badge, type BadgeProps } from "../../../components/ui/badge.tsx";
import type { SnapshotStatus } from "../../../lib/api-types.ts";

const STATUS: Record<
  SnapshotStatus,
  { label: string; icon: LucideIcon; variant: NonNullable<BadgeProps["variant"]> }
> = {
  completed: { label: "Complete", icon: CircleCheck, variant: "success" },
  running: { label: "In progress", icon: LoaderCircle, variant: "info" },
  failed: { label: "Failed", icon: CircleAlert, variant: "danger" },
};

type SnapshotStatusBadgeProps = { status: SnapshotStatus };

/** Backup status: icon + text, never colour alone. */
export function SnapshotStatusBadge({ status }: SnapshotStatusBadgeProps) {
  const { label, icon: Icon, variant } = STATUS[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
