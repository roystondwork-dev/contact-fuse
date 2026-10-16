import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.ts";

// shadcn/ui Button, restyled with contact-fuse semantic tokens.
export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-semibold whitespace-nowrap",
    "transition-colors duration-100 ease-standard",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "border border-input-border bg-surface text-text hover:bg-surface-muted active:bg-primary-subtle",
        ghost: "text-text hover:bg-surface-muted active:bg-primary-subtle",
        destructive: "bg-danger text-danger-foreground hover:opacity-90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 [&_svg]:size-4",
        md: "h-10 px-4",
        lg: "h-11 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. an <a>) with button styles. */
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
