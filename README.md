# codex-switch

**English** | [中文](README_CN.md)

A small CLI that switches between named profiles of OpenAI Codex CLI
credentials and provider configuration.

Each profile has a **kind**:

- **official** — uses Codex's built-in OpenAI provider. Switching
  rewrites `~/.codex/auth.json` and removes `model_provider` from
  `~/.codex/config.toml`.
- **custom** — overrides `model_provider` and installs a matching
  `[model_providers.<name>]` table (e.g. `tokenflux`, a proxy, a local
  Ollama endpoint, …).

Switches are atomic. Everything else in `config.toml` except the provider
fields and the optional model saved by a custom profile (personality,
features, projects, mcp_servers, tui, …) is left untouched.

## Install

```bash
npm install -g @ayor1337/codex-switch
```

`codex-switch` is now on your PATH.

### From source

```bash
git clone https://github.com/Ayor1337/CodexSwtich.git
cd CodexSwtich
npm install
npm link
```

## Usage

Bare invocation opens a full-screen TUI (Ink-based, three-pane layout
with profile list + details + an action panel):

```bash
codex-switch
```

Keys inside the TUI:

- `Tab` — switch focus between profiles and actions
- `↑↓` / `j` `k` — move within the focused pane
- `Enter` — run the highlighted profile/action
- `Esc` — go back from an edit submenu, or quit from the top level
- `q` — quit from the top level

Main operations such as add, edit, rename, delete, import, and quit are
selected from the action panel. Editing a custom profile uses an in-TUI table
for provider, model, and API key settings.

For scripting there are subcommands:

```bash
codex-switch list                     # list profiles, * marks active
codex-switch current                  # print active profile and sync status
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
**custom** profile uses a TUI table for provider configuration and API key
entry. The API key is stored as `authJson.OPENAI_API_KEY` in the profile and is
written to `~/.codex/auth.json` when that profile is switched to. The custom
profile's `model` field may be left blank; switching to that profile then
removes any existing top-level `model` from `~/.codex/config.toml`.
If the live official `~/.codex/auth.json` is not saved to any official profile,
codex-switch blocks switching so a fresh `codex login` session is not overwritten
by an older profile. Use **Import Current** to save it as a new profile, or use
**Refresh Auth** in the TUI edit menu to intentionally replace an existing
official profile's saved auth.
The TUI and CLI distinguish **sync** from **not sync**: `profiles.json.active`
remains the stored active profile, while `not sync` means the live `~/.codex`
files differ and need an explicit import or refresh.
When the TUI opens on a not-sync official profile, it prompts immediately to
either sync the current profile from `~/.codex/auth.json` or save the live state
as a new profile.

## Storage

- Profiles: `~/.config/csw/profiles.json` (mode 0600)
- Backups: `~/.config/csw/backups/` — one-time copies of the original
  `auth.json` and `config.toml`, taken on the first switch.

Profiles contain plaintext API keys / OAuth tokens. The file is created
with mode 0600.
