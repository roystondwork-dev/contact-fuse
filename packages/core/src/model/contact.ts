import type { AccountId } from "./ids.ts";

/**
 * Provider-agnostic contact model. Every provider (Google, CardDAV, ...) maps its
 * own format to and from this shape, so the matching engine never sees provider details.
 */
export interface ContactRef {
  /** Which connected account this contact lives in. */
  accountId: AccountId;
  /** The provider's own ID for the contact, e.g. a Google `resourceName`. */
  resourceId: string;
  /** Provider version stamp (Google `etag`) used to detect concurrent edits. */
  version?: string;
}

export interface LabeledValue {
  value: string;
  /** Free-form label such as "mobile", "work" or "home". */
  label?: string;
}

export interface Contact {
  ref: ContactRef;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  emails: LabeledValue[];
  phones: LabeledValue[];
  organization?: string;
  /** ISO date; the year may be missing (`--05-14`). */
  birthday?: string;
  notes?: string;
  /** Group/label names the contact belongs to. */
  groups: string[];
  /** ISO timestamp of the last change, if the provider reports it. */
  updatedAt?: string;
}

/** Fields contact-fuse manages. Updates touch only these; everything else on a record is preserved. */
export const CONTACT_FIELDS = [
  "names",
  "emails",
  "phones",
  "organization",
  "birthday",
  "notes",
  "groups",
] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];
