import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ErrorAlert } from "../../../components/error-alert.tsx";
import { FormField } from "../../../components/form-field.tsx";
import { Button } from "../../../components/ui/button.tsx";
import { Input } from "../../../components/ui/input.tsx";
import { isApiError } from "../../../lib/api-client.ts";
import {
  GOOGLE_CLIENT_ID_SUFFIX,
  validateClientId,
  validateClientSecret,
  validateGoogleClient,
  type GoogleClientFormErrors,
  type GoogleClientFormValues,
} from "../google-client-validation.ts";
import { useSaveGoogleClient } from "../use-google-client.ts";

type GoogleClientFormProps = {
  onSaved?: () => void;
  onCancel?: () => void;
};

const EMPTY_VALUES: GoogleClientFormValues = { clientId: "", clientSecret: "" };

function fieldsFromDetails(details: Record<string, unknown>): string[] {
  const fields = details["fields"];
  if (typeof fields === "string") return [fields];
  if (Array.isArray(fields)) return fields.filter((f): f is string => typeof f === "string");
  return [];
}

/** Client ID + secret form. The secret is cleared from memory as soon as it is saved. */
export function GoogleClientForm({ onSaved, onCancel }: GoogleClientFormProps) {
  const idPrefix = useId();
  const clientIdRef = useRef<HTMLInputElement>(null);
  const clientSecretRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<GoogleClientFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<GoogleClientFormErrors>({});
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const save = useSaveGoogleClient();

  const setField = (field: keyof GoogleClientFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const setFieldError = (field: keyof GoogleClientFormValues, error: string | undefined) => {
    setErrors((current) => {
      const next = { ...current };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateGoogleClient(values);
    setErrors(nextErrors);
    if (nextErrors.clientId) {
      clientIdRef.current?.focus();
      return;
    }
    if (nextErrors.clientSecret) {
      clientSecretRef.current?.focus();
      return;
    }

    save.mutate(
      { clientId: values.clientId.trim(), clientSecret: values.clientSecret.trim() },
      {
        onSuccess: () => {
          setValues(EMPTY_VALUES);
          setIsSecretVisible(false);
          toast.success("Google client saved.");
          onSaved?.();
        },
        onError: (error) => {
          if (isApiError(error) && error.code === "VALIDATION_FAILED") {
            const fields = fieldsFromDetails(error.details);
            if (fields.includes("clientId")) {
              setFieldError(
                "clientId",
                `Check the client ID. It must end with ${GOOGLE_CLIENT_ID_SUFFIX}.`,
              );
              clientIdRef.current?.focus();
            }
            if (fields.includes("clientSecret")) {
              setFieldError("clientSecret", "Check the client secret and try again.");
            }
          }
        },
      },
    );
  };

  const isFieldError =
    isApiError(save.error) &&
    save.error.code === "VALIDATION_FAILED" &&
    fieldsFromDetails(save.error.details).length > 0;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <FormField
        id={`${idPrefix}-client-id`}
        label="Client ID"
        helper={
          <>
            Ends with <code className="font-mono text-[13px]">{GOOGLE_CLIENT_ID_SUFFIX}</code>
          </>
        }
        error={errors.clientId}
      >
        {(control) => (
          <Input
            {...control}
            ref={clientIdRef}
            name="clientId"
            autoComplete="off"
            spellCheck={false}
            placeholder={`1234-abcd${GOOGLE_CLIENT_ID_SUFFIX}`}
            value={values.clientId}
            onChange={(event) => setField("clientId", event.target.value)}
            onBlur={(event) =>
              event.target.value !== "" &&
              setFieldError("clientId", validateClientId(event.target.value))
            }
          />
        )}
      </FormField>

      <FormField
        id={`${idPrefix}-client-secret`}
        label="Client secret"
        helper="Stored in your computer's keychain. It is never shown again."
        error={errors.clientSecret}
      >
        {(control) => (
          <div className="flex gap-2">
            <Input
              {...control}
              ref={clientSecretRef}
              name="clientSecret"
              type={isSecretVisible ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={values.clientSecret}
              onChange={(event) => setField("clientSecret", event.target.value)}
              onBlur={(event) =>
                event.target.value !== "" &&
                setFieldError("clientSecret", validateClientSecret(event.target.value))
              }
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={isSecretVisible ? "Hide client secret" : "Show client secret"}
              aria-pressed={isSecretVisible}
              title={isSecretVisible ? "Hide client secret" : "Show client secret"}
              onClick={() => setIsSecretVisible((visible) => !visible)}
            >
              {isSecretVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
          </div>
        )}
      </FormField>

      {save.isError && !isFieldError ? <ErrorAlert error={save.error} /> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? (
            <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
          ) : null}
          Save Google client
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
