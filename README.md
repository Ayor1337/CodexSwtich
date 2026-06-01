# codex-switch

A small CLI that switches between named profiles of OpenAI Codex CLI
credentials and provider configuration.

Each profile has a **kind**:

- **official** — uses Codex's built-in OpenAI provider. Switching
  rewrites `~/.codex/auth.json` and removes `model_provider` from
  `~/.codex/config.toml`.
- **custom** — overrides `model_provider` and installs a matching
  `[model_providers.<name>]` table (e.g. `tokenflux`, a proxy, a local
  Ollama endpoint, …).

Switches are atomic. Everything else in `config.toml` (model,
personality, features, projects, mcp_servers, tui, …) is left untouched.

## Install

```bash
cd /path/to/CodexSwitch
npm install
npm link
```

`codex-switch` is now on your PATH.

## Usage

Bare invocation opens a full-screen TUI (Ink-based, two-pane layout
with profile list + details and a keybinding help bar):

```bash
codex-switch
```

Keys inside the TUI:

- `↑↓` / `j` `k` — move selection
- `Enter` — switch to highlighted profile
- `a` — add new profile (asks: official or custom)
- `e` — edit highlighted profile
- `r` — rename
- `d` — delete
- `i` — import current `~/.codex` state
- `q` / `Esc` — quit

For scripting there are subcommands:

```bash
codex-switch list                     # list profiles, * marks active
codex-switch current                  # print the detected active profile
codex-switch use <name>               # switch to a profile
codex-switch show <name>              # print profile details (keys masked)
codex-switch import [name]            # capture current ~/.codex state
codex-switch rm <name>                # delete profile
codex-switch rename <old> <new>       # rename profile
codex-switch --help
codex-switch --version
```

First run auto-imports your current `~/.codex` state as a profile named
`current`. Adding an **official** profile captures the live
`~/.codex/auth.json` directly (run `codex login` first); adding a
**custom** profile drops you into `$EDITOR` for the TOML provider block
and JSON auth file.

## Storage

- Profiles: `~/.config/csw/profiles.json` (mode 0600)
- Backups: `~/.config/csw/backups/` — one-time copies of the original
  `auth.json` and `config.toml`, taken on the first switch.

Profiles contain plaintext API keys / OAuth tokens. The file is created
with mode 0600.
