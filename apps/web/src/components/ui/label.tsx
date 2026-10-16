import * as LabelPrimitive from "@radix-ui/react-label";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.ts";

export type LabelProps = ComponentProps<typeof LabelPrimitive.Root>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn("text-sm font-semibold text-text select-none", className)}
      {...props}
    />
  );
}
