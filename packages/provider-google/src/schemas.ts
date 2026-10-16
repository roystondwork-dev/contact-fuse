import { z } from "zod";

/**
 * Zod schemas for the People API responses contact-fuse reads. They validate only what the
 * mapping relies on; `looseObject` keeps every other field so the raw payload survives intact
 * for snapshots and exact restore.
 */
const SourceSchema = z.looseObject({
  type: z.string().optional(),
  id: z.string().optional(),
  etag: z.string().optional(),
  updateTime: z.string().optional(),
});

const FieldMetadataSchema = z.looseObject({
  primary: z.boolean().optional(),
  source: SourceSchema.optional(),
});

const NameSchema = z.looseObject({
  metadata: FieldMetadataSchema.optional(),
  displayName: z.string().optional(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
});

const LabeledFieldSchema = z.looseObject({
  metadata: FieldMetadataSchema.optional(),
  value: z.string().optional(),
  type: z.string().optional(),
});

const OrganizationSchema = z.looseObject({
  metadata: FieldMetadataSchema.optional(),
  name: z.string().optional(),
});

const DateSchema = z.looseObject({
  year: z.number().int().optional(),
  month: z.number().int().optional(),
  day: z.number().int().optional(),
});

const BirthdaySchema = z.looseObject({
  metadata: FieldMetadataSchema.optional(),
  date: DateSchema.optional(),
  text: z.string().optional(),
});

const BiographySchema = z.looseObject({
  metadata: FieldMetadataSchema.optional(),
  value: z.string().optional(),
  contentType: z.string().optional(),
});

const MembershipSchema = z.looseObject({
  metadata: FieldMetadataSchema.optional(),
  contactGroupMembership: z
    .looseObject({
      contactGroupResourceName: z.string().optional(),
      contactGroupId: z.string().optional(),
    })
    .optional(),
});

export const PersonSchema = z.looseObject({
  resourceName: z.string().min(1),
  etag: z.string().optional(),
  metadata: z
    .looseObject({
      sources: z.array(SourceSchema).optional(),
      deleted: z.boolean().optional(),
    })
    .optional(),
  names: z.array(NameSchema).optional(),
  emailAddresses: z.array(LabeledFieldSchema).optional(),
  phoneNumbers: z.array(LabeledFieldSchema).optional(),
  organizations: z.array(OrganizationSchema).optional(),
  birthdays: z.array(BirthdaySchema).optional(),
  biographies: z.array(BiographySchema).optional(),
  memberships: z.array(MembershipSchema).optional(),
});
export type GooglePerson = z.infer<typeof PersonSchema>;

export const ListConnectionsResponseSchema = z.looseObject({
  connections: z.array(PersonSchema).optional(),
  nextPageToken: z.string().optional(),
  nextSyncToken: z.string().optional(),
  totalPeople: z.number().optional(),
  totalItems: z.number().optional(),
});

export const ListOtherContactsResponseSchema = z.looseObject({
  otherContacts: z.array(PersonSchema).optional(),
  nextPageToken: z.string().optional(),
  nextSyncToken: z.string().optional(),
});

export const ContactGroupSchema = z.looseObject({
  resourceName: z.string().min(1),
  name: z.string().optional(),
  formattedName: z.string().optional(),
  groupType: z.string().optional(),
});
export type GoogleContactGroup = z.infer<typeof ContactGroupSchema>;

export const ListContactGroupsResponseSchema = z.looseObject({
  contactGroups: z.array(ContactGroupSchema).optional(),
  nextPageToken: z.string().optional(),
  nextSyncToken: z.string().optional(),
});

/** Shape of a Google API error body (AIP-193), read defensively when mapping errors. */
export const GoogleErrorBodySchema = z.looseObject({
  error: z.union([
    z.looseObject({
      code: z.number().optional(),
      status: z.string().optional(),
      message: z.string().optional(),
      errors: z.array(z.looseObject({ reason: z.string().optional() })).optional(),
      details: z
        .array(
          z.looseObject({
            reason: z.string().optional(),
            metadata: z.record(z.string(), z.string()).optional(),
          }),
        )
        .optional(),
    }),
    // OAuth token endpoint errors are a bare string, e.g. `{ "error": "invalid_grant" }`.
    z.string(),
  ]),
});
