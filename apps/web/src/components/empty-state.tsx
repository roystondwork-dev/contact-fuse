import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

/** Icon + one-sentence title + one-sentence explanation + optional primary action. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-12 text-center">
      <Icon aria-hidden="true" className="size-12 text-text-muted" />
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="max-w-prose text-sm text-text-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
