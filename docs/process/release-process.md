# Release process

contact-fuse ships **one public npm package**, `contact-fuse` (the CLI that bundles the server and
web UI). All `@contact-fuse/*` workspace packages are private and never published.

Releases are managed with **[Changesets](https://github.com/changesets/changesets)** and follow
**[Semantic Versioning](https://semver.org/)**.

## Versioning policy

| Change                                           | 1.0 and later | Before 1.0 (`0.x`) |
| ------------------------------------------------ | ------------- | ------------------ |
| Breaking change (CLI flags, config, data format) | major         | **minor**          |
| New feature                                      | minor         | minor or patch     |
| Bug fix, security fix                            | patch         | patch              |

**Pre-1.0 policy:** anything may change between minor versions, but breaking changes still need a
changeset that explains how to upgrade. **Changes to the local database and snapshot format always ship
with an automatic migration**, because user backups must stay readable in every version.

Planned release line: `0.1.0` (M1 connect and back up), `0.2.0` (M2 find duplicates),
`0.3.0` (M3 merge), `1.0.0` (M4). See the [roadmap](../product/roadmap.md).

## 1. Contributors: add a changeset

Any PR with a user-facing change includes a changeset:

```sh
pnpm changeset
```

Choose `contact-fuse`, pick the bump type, and write a one-line summary for users, following the
[content style guide](../design/content-style-guide.md). This creates `.changeset/<random-name>.md`.
Commit it with your PR.

You don't need a changeset for docs-only, test-only, CI or internal refactors.

## 2. Automation: the release PR

On every push to `main`, the release workflow (`changesets/action`):

1. Collects pending changesets.
2. Opens or updates a **"chore: release"** PR that bumps versions and updates [CHANGELOG.md](../../CHANGELOG.md).

## 3. Maintainers: publish

Merging the release PR triggers the workflow to:

1. Run the full CI pipeline ([CI/CD](ci-cd.md)).
2. Build the `contact-fuse` package.
3. Publish to npm **with provenance** (`npm publish --provenance --access public`), using GitHub OIDC
   trusted publishing. There are no long-lived npm tokens.
4. Create a git tag `vX.Y.Z` and a **GitHub Release** with the changelog section as notes.

## Release checklist (maintainer)

- [ ] Release PR changelog reads well for users
- [ ] CI green on the release PR
- [ ] Smoke test: `npx contact-fuse@<version>` on macOS (plus Linux/Windows once e2e matrix is live)
- [ ] Snapshot and DB migrations tested by upgrading from the previous version
- [ ] Merge the release PR. Verify the npm page, the provenance badge and the GitHub Release

## Pre-releases

For risky changes, use Changesets pre-release mode:

```sh
pnpm changeset pre enter next   # versions become X.Y.Z-next.N, published under the `next` dist-tag
pnpm changeset pre exit
```

## Security releases

Follow [SECURITY.md](../../SECURITY.md). Prepare the fix in a private GitHub security advisory fork,
release a patch, then publish the advisory.

## Rolling back

npm versions are never unpublished. Instead, `npm deprecate contact-fuse@X.Y.Z "<reason>"` and
release a fixed patch right away.
