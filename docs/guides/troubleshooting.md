# Troubleshooting

Find your symptom below. If nothing helps, open a bug report on GitHub and include the **Copy details** text from the app (it contains no contact data). **Never paste contacts, tokens or client secrets into issues.**

- [Installing and running](#installing-and-running)
- [Google sign-in](#google-sign-in)
- [Fetching, scanning and merging](#fetching-scanning-and-merging)
- [Local data](#local-data)
- [Development](#development)

---

## Installing and running

### `command not found: pnpm` / `node` / `brew`

The tool isn't installed, or Terminal can't find it.

- Close and reopen Terminal: the installers change `~/.zshrc`, which only loads in new windows.
- Homebrew on Apple Silicon lives in `/opt/homebrew`. Re-run the "Next steps" commands printed by its installer.
- pnpm: `corepack enable pnpm`. See [development setup](development-setup.md#5-pnpm-via-corepack).

### `npx contact-fuse` says the Node version is unsupported

contact-fuse needs Node.js 22 or newer. Check with `node --version`. With nvm: `nvm install 24 && nvm use 24`.

### "Port 4317 is already in use"

Another contact-fuse (or another app) is running.

- Find it: `lsof -i :4317`
- Stop the other contact-fuse with Ctrl+C in its Terminal window, or run on another port: `CONTACT_FUSE_PORT=4318 npx contact-fuse`.

### The browser didn't open

Open <http://127.0.0.1:4317> yourself. Use `127.0.0.1`, not your computer's network address, because contact-fuse only listens locally.

### macOS asks to allow access to the Keychain

contact-fuse stores sign-in tokens in your login Keychain. Click **Always Allow** so it doesn't ask every time. If you click **Deny**, contact-fuse can't remember your accounts.

### Native module build errors during install (`gyp ERR!`, `better-sqlite3`, `keyring`)

- macOS: `xcode-select --install`, then retry.
- Make sure you're not on an unsupported Node version (`node --version`).
- Delete and reinstall: `rm -rf node_modules && pnpm install`.

---

## Google sign-in

### "Access blocked: … has not completed the Google verification process" / `access_denied`

The account you're signing in with isn't a **test user**. Add it in Google Cloud: [setup guide, step 4](google-cloud-setup.md#step-4-add-test-users).

### "Google hasn't verified this app"

Expected for personal OAuth clients. Click **Continue**. See [step 7](google-cloud-setup.md#step-7-the-sign-in-warning).

### `invalid_client` / "The OAuth client was not found"

- The client ID or secret was pasted incorrectly. Re-copy both (watch for spaces at the start or end).
- The client type must be **Desktop app**, not "Web application".
- The client was deleted in Google Cloud. Create a new one.

### `redirect_uri_mismatch`

Your OAuth client is a **Web application**. Create a **Desktop app** client instead ([step 5](google-cloud-setup.md#step-5-create-the-oauth-client-desktop-app)).

### "People API has not been used in project … or it is disabled"

Enable the People API in the **same** project the client belongs to ([step 2](google-cloud-setup.md#step-2-enable-the-people-api)). It can take a minute to take effect.

### "Your sign-in has expired" every week

Google expires refresh tokens for apps in **Testing** mode after 7 days. This is a Google limit. Click **Sign in again** on the account card. Nothing is lost.

### The sign-in page never returns to contact-fuse

- Keep contact-fuse running while you sign in.
- Browser extensions that block `127.0.0.1` redirects (some privacy or VPN tools) can interfere. Try a private window or disable them briefly.
- Corporate Google Workspace accounts may block third-party apps. Ask your admin, or use the account outside contact-fuse.

---

## Fetching, scanning and merging

### "Google asked us to slow down" (`GOOGLE_RATE_LIMITED`)

Normal for large address books. contact-fuse retries automatically with increasing waits. If it keeps happening, wait a few minutes. Quotas reset every minute.

### Some contacts are missing from the scan

- Contacts that only exist in **Other contacts** are excluded by default. Turn on **Settings → Include Other contacts**.
- Contacts on **Never merge** (exclusions) are not suggested.
- Low-confidence matches are hidden. Turn on **Show low confidence**.

### Two contacts that are clearly the same person weren't matched

- Phone numbers without a country code use your **default country**. Check **Settings → Default country for phone numbers**.
- Try **Settings → Matching → Loose**, then re-scan.
- If it still fails, open an issue describing the pattern with **made-up** example values (e.g. "same name with initials, phone numbers differ only by a leading 0").

### Contacts that are different people were matched

Reject the match (and tick **Never merge** if needed). Consider **Strict** matching. Please report the pattern with made-up values so we can improve the engine.

### Contacts were skipped because they "changed since your backup" (`ETAG_CONFLICT`)

Someone (or your phone) edited the contact in Google after the backup. contact-fuse never overwrites newer edits. Re-scan and apply again to include them.

### The merge stopped part-way (`RUN_INTERRUPTED`)

Your computer slept, the network dropped or contact-fuse was closed. Open **History** and choose **Resume** to finish, or **Undo** to reverse what was done. The audit log knows exactly which operations finished.

### My phone doesn't show the merged contacts yet

Phones sync with Google periodically. On Android: **Settings → Accounts → (account) → Account sync → Sync now**. On iPhone with Google accounts: **Settings → Contacts → Accounts**, and toggle Contacts off and on for that account.

### I want to undo a merge

**History → (merge) → Undo this merge.** Contacts edited after the merge are listed and skipped unless you choose otherwise. See [user flows: undo](../product/user-flows.md#11-undo).

---

## Local data

### Where is my data stored?

| OS      | Location                                      |
| ------- | --------------------------------------------- |
| macOS   | `~/Library/Application Support/contact-fuse/` |
| Linux   | `~/.local/share/contact-fuse/`                |
| Windows | `%LOCALAPPDATA%\contact-fuse\Data\`           |

Override with `CONTACT_FUSE_DATA_DIR`. Tokens are stored separately in the OS keychain, not in this folder. To view the macOS folder in Finder: `open ~/Library/Application\ Support/contact-fuse`.

### How do I delete everything?

**Settings → Danger zone → Delete all local data.** This revokes all Google tokens, removes Keychain entries and deletes the database. Nothing in your Google accounts is changed.

### "Database is locked" / migration error after an update

Make sure only one contact-fuse is running. If an update's migration fails, your data is untouched: report the error code and the version numbers (old and new). As a last resort, export your backups first, then use **Delete all local data**.

---

## Development

### `ERR_PNPM_IGNORED_BUILDS`

pnpm blocks install scripts by default. Approve only the packages listed in the project's allowlist (`pnpm-workspace.yaml`) with `pnpm approve-builds`. See [dependencies](../standards/dependencies.md).

### `unmet peer typescript` warning

The project pins TypeScript 6.0.x because typescript-eslint doesn't support TypeScript 7 yet. Don't upgrade TypeScript in a PR without the policy change described in [dependencies](../standards/dependencies.md).

### Tests fail with "unhandled request" from MSW

A test made an HTTP call that no mock handles. Add a handler for it. Tests must never reach the real Google API. See [testing](../standards/testing.md).

### Playwright: "Executable doesn't exist"

Run `pnpm --filter @contact-fuse/web exec playwright install`.

### VS Code shows type errors that `pnpm typecheck` doesn't

Use the workspace TypeScript version: **⌘⇧P → TypeScript: Select TypeScript Version → Use Workspace Version**.

### Changes in `packages/core` aren't picked up by the server

The dev server (`tsx watch`) watches imported files. Restart `pnpm dev` if you added a new export file. Check that the package's `exports` points to `./src/index.ts`.
