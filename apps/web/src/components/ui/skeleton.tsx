import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.ts";

export type SkeletonProps = ComponentProps<"div">;

/** Loading placeholder. Decorative: wrap groups in an element with a status label. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-md bg-surface-muted motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}
