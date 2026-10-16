import { z } from "zod";

import type { AccountId, Contact } from "@contact-fuse/core";

/** Validates `snapshot_contacts.contact_json` on read (docs/standards/database.md#5). */
const LabeledValueSchema = z.object({ value: z.string(), label: z.string().optional() });

const ContactSchema = z.object({
  ref: z.object({
    accountId: z.string(),
    resourceId: z.string(),
    version: z.string().optional(),
  }),
  displayName: z.string().optional(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  emails: z.array(LabeledValueSchema),
  phones: z.array(LabeledValueSchema),
  organization: z.string().optional(),
  birthday: z.string().optional(),
  notes: z.string().optional(),
  groups: z.array(z.string()),
  updatedAt: z.string().optional(),
});

export function parseContactJson(json: string): Contact | undefined {
  const parsed = ContactSchema.safeParse(JSON.parse(json));
  if (!parsed.success) return undefined;
  const { ref, ...rest } = parsed.data;
  // exactOptionalPropertyTypes: drop keys Zod produced as undefined.
  const contact = Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined),
  ) as Omit<Contact, "ref">;
  return {
    ...contact,
    ref: {
      accountId: ref.accountId as AccountId,
      resourceId: ref.resourceId,
      ...(ref.version ? { version: ref.version } : {}),
    },
  };
}
