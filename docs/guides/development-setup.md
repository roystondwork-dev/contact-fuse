# Development setup

This guide takes you from a fresh Mac to running contact-fuse locally and running its tests. It assumes **no prior macOS experience**. Linux and Windows notes are at the end.

> **Contributing?** Read [CONTRIBUTING.md](../../CONTRIBUTING.md) and the [git workflow](../process/git-workflow.md) after this.

## What you'll install

| Tool                     | Version                          | Why                                                                            |
| ------------------------ | -------------------------------- | ------------------------------------------------------------------------------ |
| Xcode Command Line Tools | latest                           | Compilers needed by native modules (e.g. `better-sqlite3`, `@napi-rs/keyring`) |
| Homebrew                 | latest                           | Package manager for macOS                                                      |
| nvm                      | latest                           | Installs and switches Node.js versions                                         |
| Node.js                  | 24 (see `.nvmrc`), ≥ 22 required | Runs everything                                                                |
| pnpm                     | 12 (pinned in `package.json`)    | Installs dependencies for the monorepo                                         |
| Git                      | any recent                       | Version control                                                                |
| VS Code                  | latest                           | Recommended editor                                                             |

## 1. Mac basics (2 minutes)

- **⌘ (Command)** is the Mac's main modifier, roughly where you'd use **Ctrl** on Windows: ⌘C copy, ⌘V paste, ⌘Q quit app, ⌘Tab switch apps.
- **Spotlight** (⌘ Space) launches apps. Type the name and press Return.
- **Terminal** is the command line. Open Spotlight, type `Terminal`, press Return. The default shell is **zsh**, and its config file is `~/.zshrc`.
- `~` means your home folder (`/Users/<your-name>`). Paths use `/`.
- **Finder** is the file browser. To open the current Terminal folder in Finder, run `open .`.
- In Terminal, paste with ⌘V. If a command is still running and you want to stop it, press **Ctrl+C** (Control, not Command).

## 2. Xcode Command Line Tools

```sh
xcode-select --install
```

A pop-up appears. Click **Install** and wait. If it says the tools are already installed, you're done. Check with:

```sh
xcode-select -p   # prints a path such as /Library/Developer/CommandLineTools
```

You do **not** need the full Xcode app from the App Store.

## 3. Homebrew

Check if it's installed:

```sh
brew --version
```

If it isn't, follow the one-line install command on [brew.sh](https://brew.sh). At the end, the installer prints **"Next steps"** with two or three commands that add Homebrew to your `PATH`. **Run them**, then close and reopen Terminal.

Install Git (macOS ships an older Apple Git, and Homebrew's is newer):

```sh
brew install git
git --version
```

Tell Git who you are (this appears in your commits):

```sh
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

> Use your GitHub "noreply" email if you don't want your real email to be public. You can find it in GitHub → Settings → Emails.

## 4. Node.js with nvm

```sh
brew install nvm
mkdir -p ~/.nvm
```

Homebrew prints lines to add to `~/.zshrc`. Add them with:

```sh
cat >> ~/.zshrc <<'EOF'
export NVM_DIR="$HOME/.nvm"
[ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
EOF
source ~/.zshrc
```

Then install and use Node 24:

```sh
nvm install 24
nvm alias default 24
node --version   # v24.x
```

Inside the repo, `nvm use` reads `.nvmrc` and switches automatically.

> If you already have Node installed another way (the installer from nodejs.org, or `brew install node`), that's fine as long as `node --version` shows **22 or newer**.

## 5. pnpm via Corepack

Corepack ships with Node and installs the exact pnpm version the project pins (`packageManager` in `package.json`):

```sh
corepack enable pnpm
pnpm --version   # 12.x
```

If `corepack` is not found (some newer Node builds no longer include it), run `npm install -g corepack` first.

## 6. VS Code

```sh
brew install --cask visual-studio-code
```

To open a folder from Terminal with `code .`, open VS Code and press **⌘⇧P** (Command + Shift + P), type **Shell Command: Install 'code' command in PATH** and press Return.

### Recommended extensions

| Extension                        | ID                                      |
| -------------------------------- | --------------------------------------- |
| ESLint                           | `dbaeumer.vscode-eslint`                |
| Prettier                         | `esbenp.prettier-vscode`                |
| Tailwind CSS IntelliSense        | `bradlc.vscode-tailwindcss`             |
| Vitest                           | `vitest.explorer`                       |
| Playwright Test                  | `ms-playwright.playwright`              |
| EditorConfig                     | `editorconfig.editorconfig`             |
| Markdown All in One              | `yzhang.markdown-all-in-one`            |
| Markdown Preview Mermaid Support | `bierner.markdown-mermaid`              |
| Code Spell Checker               | `streetsidesoftware.code-spell-checker` |

Install them all at once:

```sh
code --install-extension dbaeumer.vscode-eslint esbenp.prettier-vscode bradlc.vscode-tailwindcss \
  vitest.explorer ms-playwright.playwright editorconfig.editorconfig yzhang.markdown-all-in-one \
  bierner.markdown-mermaid streetsidesoftware.code-spell-checker
```

Suggested user settings (**⌘,** → the "Open Settings (JSON)" icon at the top right):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## 7. Get the code

Fork the repository on GitHub (if you're contributing), then:

```sh
mkdir -p ~/Projects && cd ~/Projects
git clone https://github.com/<your-username>/contact-fuse.git
cd contact-fuse
nvm use
pnpm install
```

`pnpm install` may ask you to approve build scripts for native packages (for example `esbuild` and `better-sqlite3`). The approved list is committed in `pnpm-workspace.yaml`. If it prompts, run `pnpm approve-builds` and approve only packages already listed there. See [dependencies](../standards/dependencies.md).

## 8. Run the app

```sh
pnpm dev
```

This starts:

- the **server** at <http://127.0.0.1:4317> (API under `/api`)
- the **web app** at <http://127.0.0.1:5173>, which is the one to open in your browser

Press **Ctrl+C** in Terminal to stop both.

To use real Google accounts locally you need your own OAuth client. Follow the [Google Cloud setup guide](google-cloud-setup.md). You don't need it for running tests.

## 9. Run checks and tests

```sh
pnpm test        # unit + integration tests (Vitest)
pnpm check       # format check + lint + typecheck + tests: run this before every PR
```

End-to-end tests (_planned for M2; these commands will work once Playwright is added_). First time only, download browsers:

```sh
pnpm --filter @contact-fuse/web exec playwright install
pnpm --filter @contact-fuse/web test:e2e
```

More in [testing](../standards/testing.md).

## Common commands

| Command                                 | What it does                                     |
| --------------------------------------- | ------------------------------------------------ |
| `pnpm install`                          | Install or update dependencies after pulling     |
| `pnpm dev`                              | Run server and web app in watch mode             |
| `pnpm build`                            | Production build of all packages                 |
| `pnpm test`                             | Run all Vitest tests once                        |
| `pnpm test:watch`                       | Re-run tests on file change                      |
| `pnpm typecheck`                        | TypeScript type check in every package           |
| `pnpm lint`                             | ESLint                                           |
| `pnpm format`                           | Format all files with Prettier                   |
| `pnpm check`                            | Everything CI runs (except build and e2e)        |
| `pnpm --filter @contact-fuse/core test` | Run something in one package only                |
| `pnpm changeset`                        | Describe a user-facing change for the changelog  |
| `CONTACT_FUSE_LOG_LEVEL=debug pnpm dev` | Verbose server logs (never contain contact data) |

### Environment variables

| Variable                      | Default                                                                 | Purpose                                                                           |
| ----------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `CONTACT_FUSE_PORT`           | `4317`                                                                  | Server port                                                                       |
| `CONTACT_FUSE_DATA_DIR`       | OS app-data dir (`~/Library/Application Support/contact-fuse` on macOS) | Where the SQLite database lives                                                   |
| `CONTACT_FUSE_LOG_LEVEL`      | `info`                                                                  | `trace` · `debug` · `info` · `warn` · `error`                                     |
| `CONTACT_FUSE_DEFAULT_REGION` | none                                                                    | Two-letter country (e.g. `IN`) for phone numbers saved without a country code     |
| `CONTACT_FUSE_DEV_UI_ORIGIN`  | set by `pnpm dev`                                                       | Lets the Vite dev server (`http://127.0.0.1:5173`) call the API. Development only |

For development, point `CONTACT_FUSE_DATA_DIR` at a throwaway folder so you never mix test data with your real backups:

```sh
CONTACT_FUSE_DATA_DIR=./.data pnpm dev   # .data/ is git-ignored
```

## Other platforms

- **Linux:** install build tools (`sudo apt install build-essential python3`) and `libsecret-1-dev` (needed by the keychain library), then nvm, then follow the same steps from §5.
- **Windows:** use Node 24 from nvm-windows or the official installer, plus the "Desktop development with C++" workload from Visual Studio Build Tools. WSL2 also works, but the OS keychain then is Linux's (`libsecret`).

Stuck? See [troubleshooting](troubleshooting.md).
