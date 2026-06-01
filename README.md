# csw — CodexSwitch

A tiny CLI that switches between named profiles of OpenAI Codex CLI
credentials and provider configuration.

Each switch atomically:

- replaces `~/.codex/auth.json` with the profile's `authJson`
- updates `~/.codex/config.toml`:
  - sets the top-level `model_provider`
  - replaces the matching `[model_providers.<name>]` table

Everything else in `config.toml` (model, personality, features, projects,
mcp_servers, tui, ...) is left untouched.

## Install

```bash
cd /path/to/CodexSwitch
npm install
npm link
```

Now `csw` is on your PATH.

## Usage

```bash
csw                    # interactive arrow-key menu
csw list               # list profiles, * marks the currently-active one
csw current            # print the detected active profile name
csw use <name>         # switch to a profile
csw show <name>        # print profile details (API key masked)
csw import [name]      # capture current ~/.codex state as a new profile
csw rm <name>          # delete profile
csw rename <old> <new> # rename profile
csw --help
```

First run offers to import your current `~/.codex` state as a profile
called `current`.

## Storage

- Profiles: `~/.config/csw/profiles.json` (mode 0600)
- Backups: `~/.config/csw/backups/` (one-time copies of the original
  `auth.json` and `config.toml`, taken on the first switch)

Profiles contain plaintext API keys. The file is created with mode 0600.
