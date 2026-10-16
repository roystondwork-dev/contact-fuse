import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.ts";

// shadcn/ui Card. Flat by default (border, no shadow), per the elevation scale.

export type CardProps = ComponentProps<"section">;

export function Card({ className, ...props }: CardProps) {
  return (
    <section
      className={cn("rounded-md border border-border bg-surface text-text", className)}
      {...props}
    />
  );
}

export type CardHeaderProps = ComponentProps<"div">;

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 p-4 pb-0 sm:p-6 sm:pb-0", className)} {...props} />
  );
}

export type CardTitleProps = ComponentProps<"h2">;

export function CardTitle({ className, ...props }: CardTitleProps) {
  return <h2 className={cn("text-base font-semibold", className)} {...props} />;
}

export type CardDescriptionProps = ComponentProps<"p">;

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <p className={cn("max-w-prose text-sm text-text-muted", className)} {...props} />;
}

export type CardContentProps = ComponentProps<"div">;

export function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn("p-4 sm:p-6", className)} {...props} />;
}
