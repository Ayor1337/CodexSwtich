import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import TOML from '@iarna/toml';
import { ensureCswDir, loadProfiles, saveProfiles, emptyState } from './store.js';
import {
  addProfile,
  deleteProfile,
  renameProfile,
  findProfile,
  buildProfileFromCurrent,
  detectActiveProfile,
  profileKind,
} from './profiles.js';
import { switchTo } from './switcher.js';

const HELP = `codex-switch — switch Codex CLI auth + provider profiles

Usage:
  codex-switch                          interactive TUI
  codex-switch list                     list profiles
  codex-switch current                  show currently active profile (detected)
  codex-switch use <name>               switch to profile <name>
  codex-switch show <name>              print profile <name> details (key masked)
  codex-switch import [name]            import current ~/.codex state as a profile
  codex-switch rm <name>                delete profile
  codex-switch rename <old> <new>       rename profile
  codex-switch --help                   this help
  codex-switch --version                print version

Storage: ~/.config/csw/profiles.json (mode 0600)
Backups: ~/.config/csw/backups/ (one-time, on first switch)
`;

async function getVersion() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(await fs.readFile(path.join(here, '..', 'package.json'), 'utf8'));
  return pkg.version;
}

async function bootstrapState() {
  await ensureCswDir();
  let state = await loadProfiles();
  if (state !== null) return state;

  state = emptyState();
  let imported = null;
  let importError = null;
  try {
    imported = await buildProfileFromCurrent('current');
  } catch (e) {
    importError = e.message;
  }
  let bootMessage;
  if (imported) {
    addProfile(state, imported);
    state.active = 'current';
    bootMessage = {
      kind: 'info',
      text: "First run: imported your existing ~/.codex setup as profile 'current'.",
    };
  } else {
    bootMessage = {
      kind: 'warn',
      text: `No profiles yet. ${importError ? `Could not auto-detect ~/.codex state: ${importError}. ` : ''}Choose Add Profile or Import Current from the action panel.`,
    };
  }
  await saveProfiles(state);
  // Attach AFTER save so it doesn't get persisted.
  Object.defineProperty(state, '__bootMessage', { value: bootMessage, enumerable: false, configurable: true });
  return state;
}

async function cmdList(state) {
  if (state.profiles.length === 0) {
    console.log('(no profiles)');
    return;
  }
  const detected = await detectActiveProfile(state);
  for (const p of state.profiles) {
    const mark = p.name === detected ? '*' : ' ';
    const tail = profileKind(p) === 'official'
      ? '(official)'
      : `(provider=${p.providerName})`;
    console.log(`${mark} ${p.name}  ${tail}`);
  }
}

async function cmdCurrent(state) {
  const detected = await detectActiveProfile(state);
  if (!detected) {
    console.log('(no matching profile — ~/.codex may have been hand-edited)');
    if (state.active) console.log(`stored active: ${state.active}`);
    process.exitCode = 1;
    return;
  }
  console.log(detected);
}

async function cmdUse(state, name) {
  if (!name) throw new Error('usage: codex-switch use <name>');
  await switchTo(state, name, { onCollision: async () => true });
  console.log(`Switched to ${name}.`);
}

async function cmdShow(state, name) {
  if (!name) throw new Error('usage: codex-switch show <name>');
  const p = findProfile(state, name);
  if (!p) throw new Error(`Profile "${name}" not found`);
  const masked = {};
  for (const [k, v] of Object.entries(p.authJson || {})) {
    masked[k] = /key|token|secret/i.test(k) && typeof v === 'string'
      ? (v.length <= 8 ? '****' : `${v.slice(0, 3)}…${v.slice(-4)}`)
      : v;
  }
  const kind = profileKind(p);
  console.log(`name: ${p.name}`);
  console.log(`kind: ${kind}`);
  if (kind === 'custom') {
    console.log(`providerName: ${p.providerName}`);
    console.log('providerBlock:');
    console.log(TOML.stringify(p.providerBlock).replace(/^/gm, '  '));
  } else {
    console.log('(official OpenAI auth — no model_provider override)');
  }
  console.log('authJson (masked):');
  console.log(JSON.stringify(masked, null, 2).replace(/^/gm, '  '));
}

async function cmdImport(state, name) {
  const target = name || `imported-${new Date().toISOString().slice(0, 10)}`;
  const p = await buildProfileFromCurrent(target);
  addProfile(state, p);
  await saveProfiles(state);
  console.log(`Imported as "${target}".`);
}

async function cmdRm(state, name) {
  if (!name) throw new Error('usage: codex-switch rm <name>');
  deleteProfile(state, name);
  await saveProfiles(state);
  console.log(`Deleted ${name}.`);
}

async function cmdRename(state, oldName, newName) {
  if (!oldName || !newName) throw new Error('usage: codex-switch rename <old> <new>');
  renameProfile(state, oldName, newName);
  await saveProfiles(state);
  console.log(`Renamed ${oldName} → ${newName}.`);
}

export async function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(HELP);
    return;
  }
  if (argv.includes('--version') || argv.includes('-V')) {
    console.log(await getVersion());
    return;
  }

  const state = await bootstrapState();

  if (argv.length === 0) {
    if (!process.stdout.isTTY) {
      process.stdout.write(HELP);
      process.exit(1);
    }
    const { renderTui } = await import('./tui/index.js');
    await renderTui(state);
    return;
  }

  const [cmd, ...rest] = argv;
  switch (cmd) {
    case 'list':   await cmdList(state); break;
    case 'current': await cmdCurrent(state); break;
    case 'use':    await cmdUse(state, rest[0]); break;
    case 'show':   await cmdShow(state, rest[0]); break;
    case 'import': await cmdImport(state, rest[0]); break;
    case 'rm':
    case 'remove':
    case 'delete': await cmdRm(state, rest[0]); break;
    case 'rename': await cmdRename(state, rest[0], rest[1]); break;
    case 'add':
    case 'edit':
      if (!process.stdout.isTTY) {
        throw new Error(`'${cmd}' is only available in interactive mode (run bare 'codex-switch')`);
      }
      {
        const { renderTui } = await import('./tui/index.js');
        await renderTui(state);
      }
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      process.stdout.write(HELP);
      process.exit(1);
  }
}
