import type { AccountId, Contact, LabeledValue } from "@contact-fuse/core";

import type { GooglePerson } from "./schemas.ts";

export interface PersonToContactOptions {
  accountId: AccountId;
  /**
   * Contact group resource name (`contactGroups/abc`) → label name, for user-created groups only.
   * Memberships of groups missing from this map (system groups such as `myContacts` or `starred`)
   * are dropped from `Contact.groups`; see `toLabelMap` in google-provider.ts.
   */
  groupNamesByResource: ReadonlyMap<string, string>;
}

export interface ContactToPersonOptions {
  /** Label name → contact group resource name. Groups without an entry are not written. */
  groupResourcesByName?: ReadonlyMap<string, string>;
}

/** Maps a Google `Person` to the canonical `Contact`. Absent optional fields are omitted. */
export function personToContact(person: GooglePerson, options: PersonToContactOptions): Contact {
  const contact: Contact = {
    ref: { accountId: options.accountId, resourceId: person.resourceName },
    emails: toLabeledValues(person.emailAddresses),
    phones: toLabeledValues(person.phoneNumbers),
    groups: toGroupNames(person, options.groupNamesByResource),
  };
  if (isPresent(person.etag)) contact.ref.version = person.etag;

  const name = person.names?.[0];
  if (isPresent(name?.displayName)) contact.displayName = name.displayName;
  if (isPresent(name?.givenName)) contact.givenName = name.givenName;
  if (isPresent(name?.familyName)) contact.familyName = name.familyName;

  const organization = person.organizations?.[0]?.name;
  if (isPresent(organization)) contact.organization = organization;

  const birthday = toIsoBirthday(person);
  if (birthday !== undefined) contact.birthday = birthday;

  const notes = person.biographies?.[0]?.value;
  if (isPresent(notes)) contact.notes = notes;

  const updatedAt = latestUpdateTime(person);
  if (updatedAt !== undefined) contact.updatedAt = updatedAt;

  return contact;
}

/**
 * Maps a canonical `Contact` back to a Google `Person`. Used to prove the mapping round-trips and,
 * from M3, as the basis for write payloads. `metadata.sources` is output-only at Google; writers
 * must strip it before sending.
 */
export function contactToPerson(
  contact: Contact,
  options: ContactToPersonOptions = {},
): GooglePerson {
  const person: GooglePerson = { resourceName: contact.ref.resourceId };
  if (contact.ref.version !== undefined) person.etag = contact.ref.version;

  if (
    contact.displayName !== undefined ||
    contact.givenName !== undefined ||
    contact.familyName !== undefined
  ) {
    const name: NonNullable<GooglePerson["names"]>[number] = {};
    if (contact.displayName !== undefined) name.displayName = contact.displayName;
    if (contact.givenName !== undefined) name.givenName = contact.givenName;
    if (contact.familyName !== undefined) name.familyName = contact.familyName;
    person.names = [name];
  }
  if (contact.emails.length > 0) person.emailAddresses = contact.emails.map(fromLabeledValue);
  if (contact.phones.length > 0) person.phoneNumbers = contact.phones.map(fromLabeledValue);
  if (contact.organization !== undefined) person.organizations = [{ name: contact.organization }];

  const date = contact.birthday === undefined ? undefined : parseIsoBirthday(contact.birthday);
  if (date !== undefined) person.birthdays = [{ date }];

  if (contact.notes !== undefined) {
    person.biographies = [{ value: contact.notes, contentType: "TEXT_PLAIN" }];
  }

  const memberships = contact.groups.flatMap((group) => {
    const resourceName = options.groupResourcesByName?.get(group);
    return resourceName === undefined
      ? []
      : [{ contactGroupMembership: { contactGroupResourceName: resourceName } }];
  });
  if (memberships.length > 0) person.memberships = memberships;

  if (contact.updatedAt !== undefined) {
    person.metadata = { sources: [{ type: "CONTACT", updateTime: contact.updatedAt }] };
  }
  return person;
}

function isPresent(value: string | undefined): value is string {
  return value !== undefined && value.length > 0;
}

type LabeledField = NonNullable<GooglePerson["emailAddresses"]>[number];

function toLabeledValues(fields: readonly LabeledField[] | undefined): LabeledValue[] {
  return (fields ?? []).flatMap((field) => {
    if (!isPresent(field.value)) return [];
    const labeled: LabeledValue = { value: field.value };
    if (isPresent(field.type)) labeled.label = field.type;
    return [labeled];
  });
}

function fromLabeledValue(labeled: LabeledValue): LabeledField {
  const field: LabeledField = { value: labeled.value };
  if (labeled.label !== undefined) field.type = labeled.label;
  return field;
}

function toGroupNames(
  person: GooglePerson,
  groupNamesByResource: ReadonlyMap<string, string>,
): string[] {
  const names = new Set<string>();
  for (const membership of person.memberships ?? []) {
    const resourceName = membership.contactGroupMembership?.contactGroupResourceName;
    const name = resourceName === undefined ? undefined : groupNamesByResource.get(resourceName);
    if (name !== undefined) names.add(name);
  }
  return [...names];
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

/** `YYYY-MM-DD`, or `--MM-DD` when Google has no year (Google reports year 0 or omits it). */
function toIsoBirthday(person: GooglePerson): string | undefined {
  for (const birthday of person.birthdays ?? []) {
    const { year, month, day } = birthday.date ?? {};
    if (month === undefined || day === undefined || month < 1 || day < 1) continue;
    const monthDay = `${pad(month, 2)}-${pad(day, 2)}`;
    return year === undefined || year === 0 ? `--${monthDay}` : `${pad(year, 4)}-${monthDay}`;
  }
  return undefined;
}

const ISO_BIRTHDAY = /^(?:(\d{4})|-)-(\d{2})-(\d{2})$/;

function parseIsoBirthday(
  birthday: string,
): { year?: number; month: number; day: number } | undefined {
  const match = ISO_BIRTHDAY.exec(birthday);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date: { year?: number; month: number; day: number } = {
    month: Number(month),
    day: Number(day),
  };
  if (year !== undefined) date.year = Number(year);
  return date;
}

/** The newest `updateTime` across all sources (a contact can merge several, e.g. CONTACT + PROFILE). */
function latestUpdateTime(person: GooglePerson): string | undefined {
  let latest: { iso: string; time: number } | undefined;
  for (const source of person.metadata?.sources ?? []) {
    if (source.updateTime === undefined) continue;
    const time = Date.parse(source.updateTime);
    if (Number.isNaN(time)) continue;
    if (latest === undefined || time > latest.time) latest = { iso: source.updateTime, time };
  }
  return latest?.iso;
}
