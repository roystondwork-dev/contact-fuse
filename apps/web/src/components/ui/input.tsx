import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.ts";

export type InputProps = ComponentProps<"input">;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-input-border bg-surface px-3 text-sm text-text",
        "placeholder:text-text-muted",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
