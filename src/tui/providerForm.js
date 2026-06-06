import { NAME_RE } from '../profiles.js';

export const RESERVED_PROVIDER_IDS = new Set(['openai', 'ollama', 'lmstudio', 'amazon-bedrock']);

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function providerFormInitialValues(profile = {}, fallbackName = '') {
  const block = profile.providerBlock || {};
  return {
    providerName: profile.providerName || fallbackName || profile.name || '',
    model: profile.model || '',
    baseUrl: block.base_url || '',
    requiresOpenaiAuth: block.requires_openai_auth === true ? 'true' : 'false',
    apiKey: profile.authJson?.OPENAI_API_KEY || '',
  };
}

export function buildCustomProfilePatch(values, { existingAuthJson = null } = {}) {
  const providerName = clean(values.providerName);
  const model = clean(values.model);
  const baseUrl = clean(values.baseUrl);
  const requiresOpenaiAuth = values.requiresOpenaiAuth === true || values.requiresOpenaiAuth === 'true';
  const apiKey = clean(values.apiKey);

  if (!NAME_RE.test(providerName)) {
    throw new Error('providerName allowed: A-Z a-z 0-9 _ . -');
  }
  if (RESERVED_PROVIDER_IDS.has(providerName)) {
    throw new Error(`providerName "${providerName}" is reserved by Codex`);
  }
  if (!baseUrl) {
    throw new Error('base_url is required');
  }
  if (!isHttpUrl(baseUrl)) {
    throw new Error('base_url must be an http:// or https:// URL');
  }
  if (!apiKey) {
    throw new Error('api_key is required');
  }

  const providerBlock = {
    base_url: baseUrl,
    wire_api: 'responses',
    requires_openai_auth: requiresOpenaiAuth,
  };
  const authJson = {
    ...(existingAuthJson && typeof existingAuthJson === 'object' && !Array.isArray(existingAuthJson)
      ? existingAuthJson
      : {}),
    OPENAI_API_KEY: apiKey,
  };

  const patch = {
    providerName,
    providerBlock,
    authJson,
    model: model || null,
  };
  return patch;
}
