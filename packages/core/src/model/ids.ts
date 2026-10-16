/**
 * Branded IDs: entity IDs are all strings at runtime but must not be interchangeable
 * at compile time. Create them with the `as` cast only where an ID is minted or parsed.
 */
export type AccountId = string & { readonly __brand: "AccountId" };
export type SnapshotId = string & { readonly __brand: "SnapshotId" };
