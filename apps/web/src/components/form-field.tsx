import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Label } from "./ui/label.tsx";

export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FormFieldProps = {
  id: string;
  label: string;
  /** Helper text below the input. Replaced by the error when there is one. */
  helper?: ReactNode;
  error?: string | undefined;
  children: (control: FieldControlProps) => ReactNode;
};

/** Label above, control, then helper or error text linked via aria-describedby. */
export function FormField({ id, label, helper, error, children }: FormFieldProps) {
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error ?? helper);
  const control: FieldControlProps = {
    id,
    ...(hasMessage ? { "aria-describedby": messageId } : {}),
    ...(error ? { "aria-invalid": true as const } : {}),
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children(control)}
      {error ? (
        <p id={messageId} className="flex items-start gap-1 text-sm text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helper ? (
        <p id={messageId} className="text-sm text-text-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
