import { readAuth, readConfig, extractCurrent } from './codex.js';
import { deepEqual } from './util/deepEqual.js';

export const NAME_RE = /^[A-Za-z0-9_.-]+$/;

export function validateName(name) {
  if (typeof name !== 'string' || !NAME_RE.test(name)) {
    throw new Error(`Invalid profile name "${name}". Allowed: letters, digits, _ . -`);
  }
}

// Profile kinds:
//   'custom'   — overrides model_provider + installs a [model_providers.X] block
//   'official' — uses Codex's default openai provider; no model_provider in config.toml
export function profileKind(p) {
  if (p?.kind === 'official' || p?.kind === 'custom') return p.kind;
  return p?.providerName ? 'custom' : 'official';
}

export function findProfile(state, name) {
  return state.profiles.find((p) => p.name === name) || null;
}

export function addProfile(state, profile) {
  validateName(profile.name);
  if (findProfile(state, profile.name)) {
    throw new Error(`Profile "${profile.name}" already exists`);
  }
  const now = new Date().toISOString();
  state.profiles.push({ ...profile, createdAt: now, updatedAt: now });
  return state;
}

export function updateProfile(state, name, patch) {
  const p = findProfile(state, name);
  if (!p) throw new Error(`Profile "${name}" not found`);
  Object.assign(p, patch, { updatedAt: new Date().toISOString() });
  return state;
}

export function renameProfile(state, oldName, newName) {
  validateName(newName);
  if (findProfile(state, newName)) {
    throw new Error(`Profile "${newName}" already exists`);
  }
  const p = findProfile(state, oldName);
  if (!p) throw new Error(`Profile "${oldName}" not found`);
  p.name = newName;
  p.updatedAt = new Date().toISOString();
  if (state.active === oldName) state.active = newName;
  return state;
}

export function deleteProfile(state, name) {
  const idx = state.profiles.findIndex((p) => p.name === name);
  if (idx < 0) throw new Error(`Profile "${name}" not found`);
  state.profiles.splice(idx, 1);
  if (state.active === name) state.active = null;
  return state;
}

export async function buildProfileFromCurrent(name) {
  validateName(name);
  const authJson = await readAuth();
  const { parsed } = await readConfig();
  if (!authJson) {
    throw new Error('Current ~/.codex/auth.json is missing');
  }
  const { providerName, providerBlock } = extractCurrent(parsed);
  // No model_provider override → official profile.
  if (!providerName) {
    return { name, kind: 'official', authJson };
  }
  // model_provider set but no block → cannot import as custom.
  if (!providerBlock) {
    throw new Error(`Current config.toml references model_provider="${providerName}" but no [model_providers.${providerName}] table exists`);
  }
  return {
    name,
    kind: 'custom',
    authJson,
    providerName,
    providerBlock: { ...providerBlock },
  };
}

export async function detectActiveProfile(state) {
  let authJson, parsed;
  try {
    authJson = await readAuth();
    ({ parsed } = await readConfig());
  } catch {
    return null;
  }
  if (!authJson || !parsed) return null;
  const { providerName, providerBlock } = extractCurrent(parsed);
  for (const p of state.profiles) {
    if (!deepEqual(p.authJson, authJson)) continue;
    const kind = profileKind(p);
    if (kind === 'official') {
      if (!providerName) return p.name;
    } else {
      if (
        p.providerName === providerName &&
        deepEqual(p.providerBlock, providerBlock)
      ) return p.name;
    }
  }
  return null;
}
