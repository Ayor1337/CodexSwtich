import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OfficialAuthError,
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
