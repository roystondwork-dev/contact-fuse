import type { Contact } from "@contact-fuse/core";

/** RFC 4180 CSV with a UTF-8 BOM so spreadsheet apps detect the encoding. */
const BOM = "\uFEFF";
export const CSV_HEADER = [
  "Account",
  "Display name",
  "Given name",
  "Family name",
  "Emails",
  "Phones",
  "Organization",
  "Birthday",
  "Notes",
  "Labels",
] as const;

export interface CsvRow {
  accountEmail: string;
  contact: Contact;
}

export function toCsv(rows: Iterable<CsvRow>): string {
  let output = `${BOM}${CSV_HEADER.map(cell).join(",")}\r\n`;
  for (const { accountEmail, contact } of rows) {
    const values = [
      accountEmail,
      contact.displayName ?? "",
      contact.givenName ?? "",
      contact.familyName ?? "",
      contact.emails.map(withLabel).join("\n"),
      contact.phones.map(withLabel).join("\n"),
      contact.organization ?? "",
      contact.birthday ?? "",
      contact.notes ?? "",
      contact.groups.join("\n"),
    ];
    output += `${values.map(cell).join(",")}\r\n`;
  }
  return output;
}

function withLabel(item: { value: string; label?: string }): string {
  return item.label ? `${item.value} (${item.label})` : item.value;
}

/**
 * Quotes a cell and neutralises spreadsheet formulas: a value starting with = + - @ (or a tab/CR)
 * would run as a formula when the file is opened in Excel or Numbers (OWASP "CSV injection").
 * Phone numbers like "+91 …" are prefixed too; the apostrophe is hidden by spreadsheet apps.
 */
export function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
