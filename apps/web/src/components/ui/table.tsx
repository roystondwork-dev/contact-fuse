import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.ts";

// shadcn/ui Table. The wrapper scrolls horizontally so the page never does.

export type TableProps = ComponentProps<"table">;

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export type TableHeaderProps = ComponentProps<"thead">;

export function TableHeader({ className, ...props }: TableHeaderProps) {
  return <thead className={cn("bg-surface-muted", className)} {...props} />;
}

export type TableBodyProps = ComponentProps<"tbody">;

export function TableBody({ className, ...props }: TableBodyProps) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export type TableRowProps = ComponentProps<"tr">;

export function TableRow({ className, ...props }: TableRowProps) {
  return <tr className={cn("border-b border-border", className)} {...props} />;
}

export type TableHeadProps = ComponentProps<"th">;

export function TableHead({ className, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        "h-10 px-3 text-left align-middle text-xs font-semibold text-text-muted",
        className,
      )}
      {...props}
    />
  );
}

export type TableCellProps = ComponentProps<"td">;

export function TableCell({ className, ...props }: TableCellProps) {
  return <td className={cn("px-3 py-2 align-middle", className)} {...props} />;
}

export type TableCaptionProps = ComponentProps<"caption">;

export function TableCaption({ className, ...props }: TableCaptionProps) {
  return <caption className={cn("sr-only", className)} {...props} />;
}
