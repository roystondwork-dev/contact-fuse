/**
 * Google People API provider. M1 is read-only; writes arrive in M3 (see docs/product/roadmap.md).
 */
export { GOOGLE_CAPABILITIES, PROVIDER_ID, createGoogleProvider } from "./google-provider.ts";
export type { GoogleProviderOptions } from "./google-provider.ts";
export { contactToPerson, personToContact } from "./mapping.ts";
export type { ContactToPersonOptions, PersonToContactOptions } from "./mapping.ts";
export { RETRY_POLICY } from "./retry.ts";
export type { Sleep } from "./retry.ts";
export type { GooglePerson } from "./schemas.ts";
