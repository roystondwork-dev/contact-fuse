// Formatting helpers. Always use Intl with the browser locale; never hand-format dates or numbers.

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

type Noun = { one: string; other: string; zero: string };

export const CONTACT_NOUN: Noun = { one: "contact", other: "contacts", zero: "No contacts" };
export const ACCOUNT_NOUN: Noun = { one: "account", other: "accounts", zero: "No accounts" };

/** "1 contact", "1,204 contacts", "No contacts". */
export function formatCount(count: number, noun: Noun): string {
  if (count === 0) return noun.zero;
  const rule = new Intl.PluralRules().select(count);
  return `${formatNumber(count)} ${rule === "one" ? noun.one : noun.other}`;
}

/** Absolute date and time in the browser locale, e.g. "11 Oct 2026, 21:04". */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

/** Relative for the last 7 days ("2 minutes ago"), absolute after that. */
export function formatRelativeDateTime(iso: string, now: Date): string {
  const date = new Date(iso);
  const diffMs = date.getTime() - now.getTime();
  if (Math.abs(diffMs) >= 7 * DAY_MS) return formatDateTime(iso);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const diffSeconds = Math.round(diffMs / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds)
      return rtf.format(Math.round(diffSeconds / seconds), unit);
  }
  return rtf.format(0, "second");
}
