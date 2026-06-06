import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActionItems } from '../src/tui/actions.js';

test('shows add and import actions when no profile is selected', () => {
  const actions = buildActionItems({ profile: null, mode: 'browse' });

  assert.deepEqual(actions.map((a) => a.id), ['add', 'import', 'quit']);
  assert.equal(actions.find((a) => a.id === 'add').disabled, false);
});

test('shows profile actions for an official profile', () => {
  const profile = { name: 'openai', kind: 'official', authJson: {} };
  const actions = buildActionItems({ profile, mode: 'browse' });

  assert.deepEqual(actions.map((a) => a.id), [
    'switch',
    'edit',
    'rename',
    'delete',
    'add',
    'import',
    'quit',
  ]);
});

test('shows official edit submenu actions', () => {
  const profile = { name: 'openai', kind: 'official', authJson: {} };
  const actions = buildActionItems({ profile, mode: 'edit-menu' });

  assert.deepEqual(actions.map((a) => a.id), ['edit-name', 'refresh-official-auth', 'back']);
});

test('shows custom edit submenu actions', () => {
  const profile = {
    name: 'proxy',
    kind: 'custom',
    providerName: 'proxy',
    providerBlock: {},
    authJson: {},
  };
  const actions = buildActionItems({ profile, mode: 'edit-menu' });

  assert.deepEqual(actions.map((a) => a.id), [
    'edit-name',
    'edit-provider-auth',
    'back',
  ]);
});
