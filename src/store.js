import fs from 'node:fs/promises';
import { CSW_DIR, PROFILES } from './paths.js';
import { writeFileAtomic } from './util/atomic.js';

export async function ensureCswDir() {
  await fs.mkdir(CSW_DIR, { recursive: true, mode: 0o700 });
}

export async function loadProfiles() {
  let raw;
  try {
    raw = await fs.readFile(PROFILES, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  const state = JSON.parse(raw);
  if (state.version !== 1 || !Array.isArray(state.profiles)) {
    throw new Error(`Invalid profiles.json schema at ${PROFILES}`);
  }
  return state;
}

export async function saveProfiles(state) {
  await ensureCswDir();
  await writeFileAtomic(PROFILES, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
}

export function emptyState() {
  return { version: 1, active: null, profiles: [] };
}
