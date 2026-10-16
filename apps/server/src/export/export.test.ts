import { describe, expect, it } from "vitest";

import { buildContact } from "@contact-fuse/core/testing";

import { cell, toCsv } from "./csv.ts";
import { escapeText, fold, vcardFor } from "./vcard.ts";

describe("vCard 4.0", () => {
  it("writes a complete card with CRLF line endings", () => {
    const card = vcardFor(
      buildContact({
        displayName: "Asha Example",
        givenName: "Asha",
        familyName: "Example",
        emails: [{ value: "asha@example.com", label: "home" }],
        phones: [
          { value: "+91 90000 00001", label: "mobile" },
          { value: "+1 555-0100", label: "Gym" },
        ],
        organization: "Example Corp",
        birthday: "1990-05-14",
        notes: "Line one\nLine two",
        groups: ["Family", "Friends"],
        updatedAt: "2026-01-02T03:04:05.678Z",
      }),
    );
    expect(card.split("\r\n")).toEqual([
      "BEGIN:VCARD",
      "VERSION:4.0",
      "FN:Asha Example",
      "N:Example;Asha;;;",
      "EMAIL;TYPE=home:asha@example.com",
      "TEL;TYPE=cell:+91 90000 00001",
      'TEL;TYPE="Gym":+1 555-0100',
      "ORG:Example Corp",
      "BDAY:19900514",
      "NOTE:Line one\\nLine two",
      "CATEGORIES:Family,Friends",
      "REV:20260102T030405Z",
      "END:VCARD",
      "",
    ]);
  });

  it("writes a year-less birthday as --MMDD", () => {
    expect(vcardFor(buildContact({ birthday: "--05-14" }))).toContain("BDAY:--0514\r\n");
  });

  it("always has an FN, falling back to organization, email or phone", () => {
    const contact = buildContact({ emails: [{ value: "x@example.com" }] });
    delete contact.displayName;
    expect(vcardFor(contact)).toContain("FN:x@example.com\r\n");
  });

  it("escapes backslashes, commas, semicolons and newlines", () => {
    expect(escapeText("a\\b,c;d\r\ne")).toBe("a\\\\b\\,c\\;d\\ne");
  });

  it("folds long lines at 75 octets without splitting UTF-8 characters", () => {
    const line = `NOTE:${"€".repeat(60)}`;
    const folded = fold(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const [index, part] of parts.entries()) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
      if (index > 0) expect(part.startsWith(" ")).toBe(true);
    }
    expect(parts.map((part, i) => (i === 0 ? part : part.slice(1))).join("")).toBe(line);
  });
});

describe("CSV", () => {
  it("writes a BOM, header and quoted rows with multi-value cells", () => {
    const csv = toCsv([
      {
        accountEmail: "me@example.com",
        contact: buildContact({
          displayName: 'Ravi "R" Example',
          emails: [{ value: "a@example.com", label: "work" }, { value: "b@example.com" }],
          groups: ["Work"],
        }),
      },
    ]);
    const [header, row] = csv.split("\r\n");
    expect(header?.startsWith('﻿"Account","Display name"')).toBe(true);
    expect(row).toBe(
      '"me@example.com","Ravi ""R"" Example","","","a@example.com (work)\nb@example.com","","","","","Work"',
    );
  });

  it.each(['=HYPERLINK("http://evil.example")', "+91 90000 00001", "-1+1", "@SUM(A1)", "\tx"])(
    "neutralises formula-like value %j",
    (value) => {
      expect(cell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
    },
  );
});
