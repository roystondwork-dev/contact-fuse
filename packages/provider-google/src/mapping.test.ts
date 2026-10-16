import { describe, expect, it } from "vitest";

import { TEST_ACCOUNT_ID, buildContact } from "@contact-fuse/core/testing";

import { buildPerson } from "./fixtures/people.fixtures.ts";
import { contactToPerson, personToContact } from "./mapping.ts";

const groupNamesByResource = new Map([["contactGroups/abc", "Test Label"]]);
const groupResourcesByName = new Map([["Test Label", "contactGroups/abc"]]);
const options = { accountId: TEST_ACCOUNT_ID, groupNamesByResource };

describe("personToContact", () => {
  it("maps every supported field of a full person", () => {
    const person = buildPerson(1, {
      organizations: [{ name: "Example Org" }, { name: "Second Org" }],
      birthdays: [{ date: { year: 1990, month: 5, day: 14 } }],
      biographies: [{ value: "Synthetic note", contentType: "TEXT_PLAIN" }],
      memberships: [
        { contactGroupMembership: { contactGroupResourceName: "contactGroups/abc" } },
        { contactGroupMembership: { contactGroupResourceName: "contactGroups/myContacts" } },
      ],
    });

    const contact = personToContact(person, options);

    expect(contact).toEqual({
      ref: { accountId: TEST_ACCOUNT_ID, resourceId: "people/c1", version: person.etag },
      displayName: "Test Person 1",
      givenName: "Test",
      familyName: "Person 1",
      emails: [{ value: "test.person1@example.com", label: "home" }],
      phones: [{ value: "+1 555-0101", label: "mobile" }],
      organization: "Example Org",
      birthday: "1990-05-14",
      notes: "Synthetic note",
      groups: ["Test Label"],
      updatedAt: "2026-01-01T00:00:00Z",
    });
  });

  it("omits optional fields entirely when the person has no names or details", () => {
    const contact = personToContact({ resourceName: "people/c9" }, options);

    expect(contact).toEqual({
      ref: { accountId: TEST_ACCOUNT_ID, resourceId: "people/c9" },
      emails: [],
      phones: [],
      groups: [],
    });
    expect(Object.keys(contact)).not.toContain("displayName");
    expect(Object.keys(contact.ref)).not.toContain("version");
  });

  it("writes a year-less birthday as --MM-DD", () => {
    const person = buildPerson(2, { birthdays: [{ date: { month: 3, day: 7 } }] });

    expect(personToContact(person, options).birthday).toBe("--03-07");
  });

  it("treats birthday year 0 as no year and skips text-only birthdays", () => {
    const person = buildPerson(3, {
      birthdays: [{ text: "sometime in spring" }, { date: { year: 0, month: 12, day: 31 } }],
    });

    expect(personToContact(person, options).birthday).toBe("--12-31");
  });

  it("uses the latest updateTime across multiple sources", () => {
    const person = buildPerson(4, {
      metadata: {
        sources: [
          { type: "CONTACT", updateTime: "2025-06-01T10:00:00Z" },
          { type: "PROFILE", updateTime: "2026-02-03T04:05:06.789Z" },
          { type: "CONTACT", updateTime: "not-a-date" },
          { type: "DOMAIN_PROFILE" },
        ],
      },
    });

    expect(personToContact(person, options).updatedAt).toBe("2026-02-03T04:05:06.789Z");
  });

  it("drops empty values and labels instead of keeping blanks", () => {
    const person = buildPerson(5, {
      names: [{ displayName: "", givenName: "Test" }],
      emailAddresses: [{ value: "" }, { value: "test.five@example.org", type: "" }],
      phoneNumbers: [{ type: "work" }, { value: "+91 90000 00001" }],
    });

    const contact = personToContact(person, options);

    expect(contact.displayName).toBeUndefined();
    expect(contact.givenName).toBe("Test");
    expect(contact.emails).toEqual([{ value: "test.five@example.org" }]);
    expect(contact.phones).toEqual([{ value: "+91 90000 00001" }]);
  });

  it("keeps each label once when Google lists a membership twice", () => {
    const membership = {
      contactGroupMembership: { contactGroupResourceName: "contactGroups/abc" },
    };
    const person = buildPerson(6, { memberships: [membership, membership, {}] });

    expect(personToContact(person, options).groups).toEqual(["Test Label"]);
  });
});

describe("contactToPerson", () => {
  it("round-trips a full contact through a Google person", () => {
    const contact = buildContact({
      ref: { accountId: TEST_ACCOUNT_ID, resourceId: "people/c42", version: "etag-42" },
      displayName: "Test Person 42",
      givenName: "Test",
      familyName: "Person 42",
      emails: [
        { value: "test.person42@example.com", label: "work" },
        { value: "tp42@example.org" },
      ],
      phones: [{ value: "+91 90000 00042", label: "mobile" }],
      organization: "Example Org",
      birthday: "1985-11-02",
      notes: "Synthetic note",
      groups: ["Test Label"],
      updatedAt: "2026-03-04T05:06:07Z",
    });

    const roundTripped = personToContact(
      contactToPerson(contact, { groupResourcesByName }),
      options,
    );

    expect(roundTripped).toEqual(contact);
  });

  it("round-trips a minimal contact with a year-less birthday", () => {
    const contact = buildContact({
      ref: { accountId: TEST_ACCOUNT_ID, resourceId: "people/c43" },
      birthday: "--02-29",
    });
    delete contact.displayName;

    const person = contactToPerson(contact);

    expect(person).toEqual({
      resourceName: "people/c43",
      birthdays: [{ date: { month: 2, day: 29 } }],
    });
    expect(personToContact(person, options)).toEqual(contact);
  });

  it("keeps the mapped fields of a Google person through a contact round trip", () => {
    const person = buildPerson(7, {
      memberships: [{ contactGroupMembership: { contactGroupResourceName: "contactGroups/abc" } }],
    });

    const back = contactToPerson(personToContact(person, options), { groupResourcesByName });

    expect(back.resourceName).toBe(person.resourceName);
    expect(back.etag).toBe(person.etag);
    expect(back.emailAddresses).toEqual([{ value: "test.person7@example.com", type: "home" }]);
    expect(back.phoneNumbers).toEqual([{ value: "+1 555-0107", type: "mobile" }]);
    expect(back.memberships).toEqual(person.memberships);
  });

  it("skips groups without a known resource and malformed birthdays", () => {
    const contact = buildContact({ groups: ["Unknown Label"], birthday: "May 14" });

    const person = contactToPerson(contact, { groupResourcesByName });

    expect(person.memberships).toBeUndefined();
    expect(person.birthdays).toBeUndefined();
  });
});
