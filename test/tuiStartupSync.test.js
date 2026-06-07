import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldResolveOfficialDrift } from '../src/tui/index.js';

test('starts sync resolver for a not sync official active profile', () => {
  const state = {
    active: 'openai',
    profiles: [
      { name: 'openai', kind: 'official', authJson: { OPENAI_API_KEY: 'sk-old' } },
    ],
  };

  assert.equal(shouldResolveOfficialDrift(state, {
    activeName: 'openai',
    syncStatus: 'not sync',
  }), true);
});

test('does not start sync resolver for custom drift', () => {
  const state = {
    active: 'proxy',
    profiles: [
      {
        name: 'proxy',
        kind: 'custom',
        providerName: 'proxy',
        providerBlock: {},
        authJson: { OPENAI_API_KEY: 'sk-old' },
      },
    ],
  };

  assert.equal(shouldResolveOfficialDrift(state, {
    activeName: 'proxy',
    syncStatus: 'not sync',
  }), false);
});

test('does not start sync resolver when active profile is already sync', () => {
  const state = {
    active: 'openai',
    profiles: [
      { name: 'openai', kind: 'official', authJson: { OPENAI_API_KEY: 'sk-live' } },
    ],
  };

  assert.equal(shouldResolveOfficialDrift(state, {
    activeName: 'openai',
    syncStatus: 'sync',
  }), false);
});
