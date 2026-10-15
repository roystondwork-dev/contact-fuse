export { assertNever } from "./assert-never.ts";
export {
  AuthError,
  ConflictError,
  ContactFuseError,
  ERROR_CODES,
  NotFoundError,
  ProviderError,
  SafetyError,
  StorageError,
  ValidationError,
  isContactFuseError,
} from "./errors.ts";
export type { ContactFuseErrorOptions, ErrorCode, ErrorDetails } from "./errors.ts";
export { CONTACT_FIELDS } from "./model/contact.ts";
export type { Contact, ContactField, ContactRef, LabeledValue } from "./model/contact.ts";
export type { AccountId, SnapshotId } from "./model/ids.ts";
export type {
  ContactProvider,
  ContactUpdate,
  ListContactsOptions,
  ListContactsResult,
  ProviderAccountInfo,
  ProviderCapabilities,
  ProviderContact,
  ProviderFactory,
  ProviderLabel,
  WriteOutcome,
} from "./model/provider.ts";
export type { Clock, IdGenerator } from "./model/runtime.ts";
export { normalizeEmail } from "./normalize/email.ts";
