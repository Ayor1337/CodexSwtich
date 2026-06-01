import fs from 'node:fs/promises';
import path from 'node:path';
import { AUTH, CONFIG, BACKUPS } from './paths.js';
import { readConfig, applyProfileToConfig, writeAuth, writeConfig } from './codex.js';
import { findProfile, validateName, profileKind } from './profiles.js';
import { saveProfiles } from './store.js';
import { deepEqual } from './util/deepEqual.js';

async function backupOnceIfNeeded() {
  try {
    const entries = await fs.readdir(BACKUPS);
    if (entries.length > 0) return false;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  await fs.mkdir(BACKUPS, { recursive: true, mode: 0o700 });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  for (const src of [AUTH, CONFIG]) {
    try {
      const data = await fs.readFile(src);
      const dest = path.join(BACKUPS, `${path.basename(src)}.${ts}.bak`);
      await fs.writeFile(dest, data, { mode: 0o600 });
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  return true;
}

export async function switchTo(state, name, { onCollision } = {}) {
  const profile = findProfile(state, name);
  if (!profile) throw new Error(`Profile "${name}" not found`);

  if (!profile.authJson || typeof profile.authJson !== 'object') {
    throw new Error(`Profile "${name}" has invalid authJson`);
  }
  const kind = profileKind(profile);
  if (kind === 'custom') {
    validateName(profile.providerName);
    if (!profile.providerBlock || typeof profile.providerBlock !== 'object') {
      throw new Error(`Profile "${name}" has invalid providerBlock`);
    }
  }

  const didBackup = await backupOnceIfNeeded();

  const { parsed, mode } = await readConfig();

  if (kind === 'custom') {
    const existing = parsed.model_providers?.[profile.providerName];
    if (existing && !deepEqual(existing, profile.providerBlock)) {
      const proceed = onCollision
        ? await onCollision(profile.providerName, existing, profile.providerBlock)
        : true;
      if (!proceed) throw new Error('Aborted by user (collision)');
    }
  }

  applyProfileToConfig(parsed, profile);
  await writeConfig(parsed, mode);
  await writeAuth(profile.authJson);

  state.active = name;
  await saveProfiles(state);

  return { didBackup };
}
