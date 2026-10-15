/**
 * Normalise an email address for comparison: trim and lowercase.
 * Returns `undefined` for values that are not plausibly an email.
 */
export function normalizeEmail(raw: string): string | undefined {
  const email = raw.trim().toLowerCase();
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@") || at === email.length - 1) {
    return undefined;
  }
  return email;
}
