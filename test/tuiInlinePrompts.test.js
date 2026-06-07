import test from 'node:test';
import assert from 'node:assert/strict';
import { isInlinePromptMode } from '../src/tui/App.js';

test('all action prompt modes render inside the TUI layout slot', () => {
  const inlineModes = [
    'add:kind',
    'add:name',
    'add:provider-auth',
    'add:confirm-switch',
    'rename',
    'confirm-delete',
    'import:name',
    'edit:rename',
    'edit:provider-auth',
    'resolve-sync',
    'resolve-import:name',
  ];

  assert.deepEqual(inlineModes.filter(isInlinePromptMode), inlineModes);
});

test('non-prompt modes keep their normal layout behavior', () => {
  for (const mode of ['browse', 'edit-menu', 'message']) {
    assert.equal(isInlinePromptMode(mode), false);
  }
});
