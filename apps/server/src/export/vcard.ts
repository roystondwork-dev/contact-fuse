import type { Contact, LabeledValue } from "@contact-fuse/core";

/**
 * vCard 4.0 writer (RFC 6350). Pure: takes contacts, returns text. Lines end with CRLF and are
 * folded at 75 octets without splitting a UTF-8 character.
 */
const CRLF = "\r\n";
const MAX_LINE_OCTETS = 75;

/** Google/common labels → vCard TYPE values. Unknown labels are kept in a quoted TYPE. */
const TYPE_BY_LABEL: Record<string, string> = {
  mobile: "cell",
  cell: "cell",
  home: "home",
  work: "work",
  main: "voice",
  homefax: "fax,home",
  workfax: "fax,work",
  pager: "pager",
  other: "",
};

export function toVcard(contacts: Iterable<Contact>): string {
  let output = "";
  for (const contact of contacts) output += vcardFor(contact);
  return output;
}

export function vcardFor(contact: Contact): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:4.0"];
  // FN is mandatory in vCard 4.0.
  lines.push(`FN:${escapeText(formattedName(contact))}`);
  if (contact.familyName || contact.givenName) {
    lines.push(
      `N:${[contact.familyName ?? "", contact.givenName ?? "", "", "", ""].map(escapeComponent).join(";")}`,
    );
  }
  for (const email of contact.emails)
    lines.push(`EMAIL${typeParam(email)}:${escapeText(email.value)}`);
  for (const phone of contact.phones)
    lines.push(`TEL${typeParam(phone)}:${escapeText(phone.value)}`);
  if (contact.organization) lines.push(`ORG:${escapeComponent(contact.organization)}`);
  if (contact.birthday)
    lines.push(`BDAY:${contact.birthday.replaceAll("-", "").replace(/^(?=\d{4}$)/, "--")}`);
  if (contact.notes) lines.push(`NOTE:${escapeText(contact.notes)}`);
  if (contact.groups.length > 0)
    lines.push(`CATEGORIES:${contact.groups.map(escapeComponent).join(",")}`);
  if (contact.updatedAt)
    lines.push(`REV:${contact.updatedAt.replace(/[-:]/g, "").replace(/\.\d+/, "")}`);
  lines.push("END:VCARD");
  return lines.map(fold).join(CRLF) + CRLF;
}

function formattedName(contact: Contact): string {
  return (
    contact.displayName ??
    ([contact.givenName, contact.familyName].filter(Boolean).join(" ") ||
      contact.organization ||
      contact.emails[0]?.value ||
      contact.phones[0]?.value ||
      "")
  );
}

function typeParam(item: LabeledValue): string {
  if (!item.label) return "";
  const known = TYPE_BY_LABEL[item.label.toLowerCase()];
  if (known !== undefined) return known ? `;TYPE=${known}` : "";
  // Custom label (e.g. "Gym"): keep it so nothing is lost on re-import.
  return `;TYPE="${item.label.replace(/["\\\r\n]/g, " ")}"`;
}

/** TEXT value escaping (RFC 6350 §3.4). */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Escaping for one component of a structured value (N, ORG) or a list item (CATEGORIES). */
function escapeComponent(value: string): string {
  return escapeText(value);
}

/** Folds a content line at 75 octets; continuation lines start with a single space. */
export function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= MAX_LINE_OCTETS) return line;
  const parts: string[] = [];
  let current = "";
  let currentOctets = 0;
  for (const char of line) {
    const octets = encoder.encode(char).length;
    // The first line has 75 octets; continuation lines lose one octet to the leading space.
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (currentOctets + octets > limit) {
      parts.push(current);
      current = "";
      currentOctets = 0;
    }
    current += char;
    currentOctets += octets;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}
