import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.ts";

// Badges always pair colour with an icon and a text label (never colour alone).
export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-border bg-badge-neutral text-text-muted",
        primary: "border-transparent bg-primary-subtle text-primary",
        success: "border-transparent bg-success-subtle text-success",
        warning: "border-transparent bg-warning-subtle text-warning",
        danger: "border-transparent bg-danger-subtle text-danger",
        info: "border-transparent bg-info-subtle text-info",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
