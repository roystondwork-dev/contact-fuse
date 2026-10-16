import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.ts";

// shadcn/ui Alert: an inline notice on a page. Always include an icon and text.
export const alertVariants = cva(
  "grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-md border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-5",
  {
    variants: {
      variant: {
        info: "border-info bg-info-subtle text-text [&>svg]:text-info",
        success: "border-success bg-success-subtle text-text [&>svg]:text-success",
        warning: "border-warning bg-warning-subtle text-text [&>svg]:text-warning",
        danger: "border-danger bg-danger-subtle text-text [&>svg]:text-danger",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

export type AlertProps = ComponentProps<"div"> & VariantProps<typeof alertVariants>;

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div className={cn(alertVariants({ variant }), className)} {...props} />;
}

export type AlertTitleProps = ComponentProps<"p">;

export function AlertTitle({ className, ...props }: AlertTitleProps) {
  return <p className={cn("col-start-2 font-semibold", className)} {...props} />;
}

export type AlertDescriptionProps = ComponentProps<"div">;

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return <div className={cn("col-start-2 flex flex-col gap-2", className)} {...props} />;
}
