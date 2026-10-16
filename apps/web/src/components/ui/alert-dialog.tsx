import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.ts";
import { buttonVariants } from "./button.tsx";

// shadcn/ui AlertDialog. Use it for every destructive confirmation (never window.confirm).
// Radix focuses Cancel first, traps focus, closes on Esc and returns focus to the trigger.

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export type AlertDialogContentProps = ComponentProps<typeof AlertDialogPrimitive.Content>;

export function AlertDialogContent({ className, ...props }: AlertDialogContentProps) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-surface/80 backdrop-blur-sm" />
      <AlertDialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4",
          "rounded-lg border border-border bg-surface-raised p-6 text-text shadow-lg",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

export type AlertDialogHeaderProps = ComponentProps<"div">;

export function AlertDialogHeader({ className, ...props }: AlertDialogHeaderProps) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

export type AlertDialogFooterProps = ComponentProps<"div">;

export function AlertDialogFooter({ className, ...props }: AlertDialogFooterProps) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export type AlertDialogTitleProps = ComponentProps<typeof AlertDialogPrimitive.Title>;

export function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("text-base font-semibold break-words", className)}
      {...props}
    />
  );
}

export type AlertDialogDescriptionProps = ComponentProps<typeof AlertDialogPrimitive.Description>;

export function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return (
    <AlertDialogPrimitive.Description
      className={cn("text-sm text-text-muted", className)}
      {...props}
    />
  );
}

export type AlertDialogCancelProps = ComponentProps<typeof AlertDialogPrimitive.Cancel>;

export function AlertDialogCancel({ className, ...props }: AlertDialogCancelProps) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "secondary" }), className)}
      {...props}
    />
  );
}

export type AlertDialogActionProps = ComponentProps<typeof AlertDialogPrimitive.Action>;

/** Closes the dialog when clicked. For async actions use a plain destructive Button instead. */
export function AlertDialogAction({ className, ...props }: AlertDialogActionProps) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants({ variant: "destructive" }), className)}
      {...props}
    />
  );
}
