import { readAuth, readConfig, extractCurrent } from './codex.js';
import { deepEqual } from './util/deepEqual.js';

export class OfficialAuthError extends Error {
  constructor(message) { super(message); this.name = 'OfficialAuthError'; }
}

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

// Validate that the current Codex state is usable as an "official" profile.
// Checks two things:
//   1. auth.json has either an API-key shape OR a complete OAuth tokens bundle.
//   2. config.toml does NOT have `model_provider` set — if it does, the current
//      state is a custom-provider setup, not an official one, regardless of
//      what auth.json looks like.
// Returns the matched form ('api-key' | 'oauth'); throws OfficialAuthError
// otherwise.
export function validateOfficialAuth(auth, configParsed) {
  if (!auth || typeof auth !== 'object' || Array.isArray(auth)) {
    throw new OfficialAuthError('auth.json must be a JSON object');
  }
  const hasApiKey =
    typeof auth.OPENAI_API_KEY === 'string' && auth.OPENAI_API_KEY.length > 0;
  const t = auth.tokens;
  const hasOAuth =
    t && typeof t === 'object' && !Array.isArray(t) &&
    typeof t.id_token === 'string' && t.id_token.length > 0 &&
    typeof t.access_token === 'string' && t.access_token.length > 0 &&
    typeof t.refresh_token === 'string' && t.refresh_token.length > 0;
  if (!hasApiKey && !hasOAuth) {
    throw new OfficialAuthError(
      "auth.json doesn't look like a valid Codex credential. " +
      "Expected either a non-empty OPENAI_API_KEY string, " +
      "or a tokens object with id_token, access_token, and refresh_token. " +
      "Run `codex login` first, then try again."
    );
  }
  if (configParsed && typeof configParsed === 'object') {
    const mp = configParsed.model_provider;
    if (typeof mp === 'string' && mp.length > 0) {
      throw new OfficialAuthError(
        `~/.codex/config.toml currently sets model_provider="${mp}", ` +
        `so the live state is a custom-provider setup, not an official one. ` +
        `Either run \`codex login\` (and unset model_provider) before capturing, ` +
        `or add this as a "custom" profile instead.`
      );
    }
    const model = configParsed.model;
    if (typeof model === 'string' && model.trim()) {
      throw new OfficialAuthError(
        `~/.codex/config.toml currently sets model="${model}", ` +
        `so the live state carries a model override. Add this as a "custom" profile ` +
        `or remove model before capturing an official profile.`
      );
    }
  }
  return hasOAuth ? 'oauth' : 'api-key';
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

export function refreshOfficialAuthFromLive(state, name, authJson, configParsed) {
  const p = findProfile(state, name);
  if (!p) throw new Error(`Profile "${name}" not found`);
  if (profileKind(p) !== 'official') {
    throw new Error(`Profile "${name}" is not an official profile`);
  }
  validateOfficialAuth(authJson, configParsed);
  if (deepEqual(p.authJson, authJson)) return false;
  p.authJson = authJson;
  p.updatedAt = new Date().toISOString();
  return true;
}

export async function refreshOfficialProfileFromCurrent(state, name) {
  const authJson = await readAuth();
  const { parsed } = await readConfig();
  if (!authJson) {
    throw new Error('Current ~/.codex/auth.json is missing');
  }
  return refreshOfficialAuthFromLive(state, name, authJson, parsed);
}

export async function refreshActiveOfficialAuthFromCurrent(state) {
  const active = state.active ? findProfile(state, state.active) : null;
  if (!active || profileKind(active) !== 'official') return false;
  try {
    return await refreshOfficialProfileFromCurrent(state, active.name);
  } catch {
    return false;
  }
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

function normalizeModel(model) {
  return typeof model === 'string' && model.trim() ? model.trim() : null;
}

export async function buildProfileFromCurrent(name) {
  validateName(name);
  const authJson = await readAuth();
  const { parsed } = await readConfig();
  if (!authJson) {
    throw new Error('Current ~/.codex/auth.json is missing');
  }
  const { providerName, providerBlock, model } = extractCurrent(parsed);
  // No model_provider override → official profile.
  if (!providerName) {
    validateOfficialAuth(authJson, parsed);
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
    model,
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
  const { providerName, providerBlock, model } = extractCurrent(parsed);
  for (const p of state.profiles) {
    if (!deepEqual(p.authJson, authJson)) continue;
    const kind = profileKind(p);
    if (kind === 'official') {
      if (!providerName && !normalizeModel(model)) return p.name;
    } else {
      if (
        p.providerName === providerName &&
        deepEqual(p.providerBlock, providerBlock) &&
        normalizeModel(p.model) === normalizeModel(model)
      ) return p.name;
    }
  }
  return null;
}
