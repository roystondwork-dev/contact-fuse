import type { ProviderError } from "../errors.ts";
import type { Contact, ContactField, ContactRef } from "./contact.ts";

/**
 * Contract every contact source implements. Types only: implementations live in
 * packages/provider-*. See docs/architecture/provider-interface.md.
 */
export interface ProviderCapabilities {
  /** Supports sync tokens for incremental listing. */
  incrementalSync: boolean;
  /** Supports groups/labels. */
  labels: boolean;
  /** Supports etag / If-Match conflict detection on writes. */
  versionedWrites: boolean;
  /** Has a separate source of auto-saved contacts (Google "Other contacts"). */
  otherContacts: boolean;
  maxBatchCreate: number;
  maxBatchUpdate: number;
  maxBatchDelete: number;
}

export interface ProviderAccountInfo {
  /** Stable ID of the account at the provider (Google `sub`). */
  providerAccountId: string;
  email: string;
  displayName?: string;
}

export interface ListContactsOptions {
  /** Omit for a full listing. */
  syncToken?: string;
  includeOtherContacts?: boolean;
  signal?: AbortSignal;
  onProgress?: (fetchedCount: number) => void;
}

export interface ProviderContact {
  contact: Contact;
  /** Native payload, stored so a contact can be restored exactly. */
  raw: unknown;
  /** Where the contact came from inside the account. */
  source: "contacts" | "other-contacts";
}

export interface ListContactsResult {
  contacts: ProviderContact[];
  /** Only filled for incremental sync. */
  deletedResourceIds: string[];
  nextSyncToken?: string;
  /** True when the sync token expired and a full listing was returned instead. */
  fullResync: boolean;
}

export type WriteOutcome =
  | { status: "succeeded"; ref: ContactRef; raw: unknown }
  | { status: "conflict"; ref: ContactRef }
  | { status: "not-found"; ref: ContactRef }
  | { status: "failed"; ref?: ContactRef; error: ProviderError };

export interface ContactUpdate {
  ref: ContactRef;
  contact: Contact;
  /** Only these fields are written; everything else on the record is preserved. */
  fields: ContactField[];
}

export interface ProviderLabel {
  id: string;
  name: string;
}

export interface ContactProvider {
  readonly id: string;
  readonly capabilities: ProviderCapabilities;

  getAccountInfo(): Promise<ProviderAccountInfo>;
  listContacts(options?: ListContactsOptions): Promise<ListContactsResult>;
  listLabels(): Promise<ProviderLabel[]>;

  /** Write methods chunk to batch limits themselves and return outcomes in input order. */
  createContacts(contacts: Contact[]): Promise<WriteOutcome[]>;
  updateContacts(updates: ContactUpdate[]): Promise<WriteOutcome[]>;
  deleteContacts(refs: ContactRef[]): Promise<WriteOutcome[]>;

  ensureLabel(name: string): Promise<ProviderLabel>;
  addToLabel(labelId: string, refs: ContactRef[]): Promise<WriteOutcome[]>;
}

/** Each provider defines its own credentials shape (e.g. an authorised OAuth client for Google). */
export type ProviderFactory<TCredentials> = (credentials: TCredentials) => ContactProvider;
