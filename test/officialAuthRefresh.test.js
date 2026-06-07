import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OfficialAuthError,
  UnsavedOfficialAuthError,
  assertOfficialAuthSavedFromLive,
  findMatchingOfficialProfile,
  profileSyncStatusFromLive,
  refreshOfficialAuthFromLive,
} from '../src/profiles.js';

test('refreshes an official profile from live Codex auth', () => {
  const state = {
    profiles: [
      {
        name: 'openai',
        kind: 'official',
        authJson: {
          tokens: {
            id_token: 'old-id',
            access_token: 'old-access',
            refresh_token: 'old-refresh',
          },
        },
      },
    ],
  };

  const liveAuth = {
    tokens: {
      id_token: 'new-id',
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    },
  };

  const refreshed = refreshOfficialAuthFromLive(state, 'openai', liveAuth, {});

  assert.equal(refreshed, true);
  assert.deepEqual(state.profiles[0].authJson, liveAuth);
  assert.match(state.profiles[0].updatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('does not rewrite an already current official profile', () => {
  const liveAuth = { OPENAI_API_KEY: 'sk-test' };
  const state = {
    profiles: [
      { name: 'openai', kind: 'official', authJson: liveAuth },
    ],
  };

  const refreshed = refreshOfficialAuthFromLive(state, 'openai', liveAuth, {});

  assert.equal(refreshed, false);
  assert.equal(state.profiles[0].updatedAt, undefined);
});

test('rejects refresh when live config is not official', () => {
  const state = {
    profiles: [
      { name: 'openai', kind: 'official', authJson: { OPENAI_API_KEY: 'old' } },
    ],
  };

  assert.throws(
    () => refreshOfficialAuthFromLive(
      state,
      'openai',
      { OPENAI_API_KEY: 'sk-test' },
      { model_provider: 'proxy' },
    ),
    OfficialAuthError,
  );
});

test('rejects refreshing a custom profile as official auth', () => {
  const state = {
    profiles: [
      {
        name: 'proxy',
        kind: 'custom',
        providerName: 'proxy',
        providerBlock: {},
        authJson: { OPENAI_API_KEY: 'old' },
      },
    ],
  };

  assert.throws(
    () => refreshOfficialAuthFromLive(state, 'proxy', { OPENAI_API_KEY: 'sk-test' }, {}),
    /not an official profile/,
  );
});

test('finds a saved official profile for the live official auth', () => {
  const liveAuth = { OPENAI_API_KEY: 'sk-live' };
  const state = {
    profiles: [
      {
        name: 'proxy',
        kind: 'custom',
        providerName: 'proxy',
        providerBlock: {},
        authJson: liveAuth,
      },
      { name: 'openai', kind: 'official', authJson: liveAuth },
    ],
  };

  const matched = findMatchingOfficialProfile(state, liveAuth, {});

  assert.equal(matched.name, 'openai');
});

test('blocks switching away from unsaved live official auth', () => {
  const state = {
    profiles: [
      { name: 'openai-old', kind: 'official', authJson: { OPENAI_API_KEY: 'sk-old' } },
    ],
  };

  assert.throws(
    () => assertOfficialAuthSavedFromLive(state, { OPENAI_API_KEY: 'sk-new' }, {}),
    UnsavedOfficialAuthError,
  );
});

test('does not treat custom live config as unsaved official auth', () => {
  const state = {
    profiles: [
      { name: 'openai-old', kind: 'official', authJson: { OPENAI_API_KEY: 'sk-old' } },
    ],
  };

  assert.throws(
    () => assertOfficialAuthSavedFromLive(
      state,
      { OPENAI_API_KEY: 'sk-new' },
      { model_provider: 'proxy' },
    ),
    OfficialAuthError,
  );
});

test('reports sync when stored active matches the live state', () => {
  const liveAuth = { OPENAI_API_KEY: 'sk-live' };
  const state = {
    active: 'openai',
    profiles: [
      { name: 'openai', kind: 'official', authJson: liveAuth },
    ],
  };

  assert.deepEqual(profileSyncStatusFromLive(state, liveAuth, {}), {
    activeName: 'openai',
    syncStatus: 'sync',
    detectedName: 'openai',
    storedActive: 'openai',
    reason: 'stored-active-matches-live',
  });
});

test('reports not sync when stored active differs from live state', () => {
  const state = {
    active: 'openai',
    profiles: [
      { name: 'openai', kind: 'official', authJson: { OPENAI_API_KEY: 'sk-old' } },
    ],
  };

  assert.deepEqual(profileSyncStatusFromLive(state, { OPENAI_API_KEY: 'sk-new' }, {}), {
    activeName: 'openai',
    syncStatus: 'not sync',
    detectedName: null,
    storedActive: 'openai',
    reason: 'stored-active-differs-from-live',
  });
});

test('reports none when there is no stored active or matching profile', () => {
  const state = {
    active: null,
    profiles: [
      { name: 'openai', kind: 'official', authJson: { OPENAI_API_KEY: 'sk-old' } },
    ],
  };

  assert.deepEqual(profileSyncStatusFromLive(state, { OPENAI_API_KEY: 'sk-new' }, {}), {
    activeName: null,
    syncStatus: 'none',
    detectedName: null,
    storedActive: null,
    reason: 'no-matching-profile',
  });
});
