---
name: add-provider
description: Use when adding a new contact source integration (e.g. CardDAV/iCloud, Microsoft/Outlook) as a packages/provider-* package, or when extending an existing provider's read/write capabilities.
---

# Add a provider

A provider maps an external contact source to and from the canonical `Contact` in
`@contact-fuse/core`. Core must never import provider code.

## Before you start

1. Read [docs/architecture/provider-interface.md](../../../docs/architecture/provider-interface.md) and
   [ADR 0007](../../../docs/adr/0007-provider-abstraction-and-canonical-model.md).
2. A new provider is a significant decision. Write an ADR first (skill: `new-adr`).

## Steps

1. **Create the package** `packages/provider-<name>/` (kebab-case) by copying the shape of
   `packages/provider-google/`:
   - `package.json`: `"name": "@contact-fuse/provider-<name>"`, `"private": true`, `"type": "module"`,
     `exports` → `./src/index.ts`, and a `typecheck` script
   - `tsconfig.json` extending `../../tsconfig.base.json`
2. **Implement the provider interface** from the provider-interface doc: auth, list (paginated and
   incremental where supported), create, update (with version/etag), delete, and capability flags.
3. **Write the mapping** in `src/map-contact.ts`: provider format ⇄ `Contact`. Keep `ref.resourceId`
   and `ref.version` (etag) intact, and never drop fields silently. Unknown fields must survive a round trip.
4. **Validate every API response with Zod** at the boundary. Wrap failures in `ContactFuseError`
   with provider-specific codes (`PROVIDER_<NAME>_RATE_LIMITED`, …).
5. **Rate limits:** batch writes, retry 429/5xx with exponential backoff and jitter, and honour `Retry-After`.
6. **Secrets:** store tokens and passwords in the OS keychain only (`@napi-rs/keyring`). Never log them.
7. **Register the provider** in `apps/server` (provider registry) and add its env vars as
   `CONTACT_FUSE_<NAME>_*` if any are needed.
8. **Tests** (skill: `write-tests`):
   - mapping round-trip tests with synthetic fixtures
   - HTTP behaviour with **MSW**: success, pagination, etag conflict, 429 retry, partial batch failure
9. **Docs:** update the provider-interface doc, add a setup guide in `docs/guides/` if users must
   configure anything, and update the [roadmap](../../../docs/product/roadmap.md).
10. Run the `pre-pr-check` skill.

## Must not

- Write to the provider outside the merge-run executor (snapshot → plan → audit log)
- Log names, emails, phones or tokens
- Import provider types into `packages/core`
