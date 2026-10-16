export const GOOGLE_CLIENT_ID_SUFFIX = ".apps.googleusercontent.com";

export type GoogleClientFormValues = {
  clientId: string;
  clientSecret: string;
};

export type GoogleClientFormErrors = Partial<Record<keyof GoogleClientFormValues, string>>;

export function validateClientId(value: string): string | undefined {
  const clientId = value.trim();
  if (clientId === "") return "Enter your client ID.";
  if (!clientId.endsWith(GOOGLE_CLIENT_ID_SUFFIX) || clientId === GOOGLE_CLIENT_ID_SUFFIX) {
    return `Client ID must end with ${GOOGLE_CLIENT_ID_SUFFIX}. Copy it again from Google Cloud.`;
  }
  return undefined;
}

export function validateClientSecret(value: string): string | undefined {
  if (value.trim() === "") return "Enter your client secret.";
  return undefined;
}

/** Same rules as the server (docs/architecture/http-api.md#google-oauth-client-settings). */
export function validateGoogleClient(values: GoogleClientFormValues): GoogleClientFormErrors {
  const errors: GoogleClientFormErrors = {};
  const clientIdError = validateClientId(values.clientId);
  const clientSecretError = validateClientSecret(values.clientSecret);
  if (clientIdError) errors.clientId = clientIdError;
  if (clientSecretError) errors.clientSecret = clientSecretError;
  return errors;
}
