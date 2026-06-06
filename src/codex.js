import fs from 'node:fs/promises';
import TOML from '@iarna/toml';
import { AUTH, CONFIG } from './paths.js';
import { writeFileAtomic } from './util/atomic.js';

export async function readAuth() {
  try {
    const raw = await fs.readFile(AUTH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

export async function readConfig() {
  let raw, mode;
  try {
    raw = await fs.readFile(CONFIG, 'utf8');
    const stat = await fs.stat(CONFIG);
    mode = stat.mode & 0o777;
  } catch (e) {
    if (e.code === 'ENOENT') return { raw: '', parsed: {}, mode: 0o600 };
    throw e;
  }
  const parsed = TOML.parse(raw);
  return { raw, parsed, mode };
}

export function extractCurrent(parsed) {
  const providerName = parsed.model_provider ?? null;
  const providerBlock = providerName && parsed.model_providers
    ? parsed.model_providers[providerName] ?? null
    : null;
  const model = typeof parsed.model === 'string' && parsed.model.trim()
    ? parsed.model.trim()
    : null;
  return { providerName, providerBlock, model };
}

export function applyProfileToConfig(parsed, profile) {
  const kind = profile.kind || (profile.providerName ? 'custom' : 'official');
  if (kind === 'official') {
    // Drop active overrides; leave [model_providers.*] tables inert when unreferenced.
    delete parsed.model_provider;
    delete parsed.model;
    return parsed;
  }
  parsed.model_provider = profile.providerName;
  if (typeof profile.model === 'string' && profile.model.trim()) {
    parsed.model = profile.model.trim();
  } else {
    delete parsed.model;
  }
  if (!parsed.model_providers || typeof parsed.model_providers !== 'object') {
    parsed.model_providers = {};
  }
  parsed.model_providers[profile.providerName] = { ...profile.providerBlock };
  return parsed;
}

export async function writeAuth(obj) {
  await writeFileAtomic(AUTH, JSON.stringify(obj, null, 2) + '\n', { mode: 0o600 });
}

export async function writeConfig(parsed, mode = 0o600) {
  const text = TOML.stringify(parsed);
  await writeFileAtomic(CONFIG, text, { mode });
}
