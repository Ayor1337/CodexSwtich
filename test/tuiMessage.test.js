import test from 'node:test';
import assert from 'node:assert/strict';
import {
  messageContentLines,
  messageSlotProps,
  shouldDismissMessage,
} from '../src/tui/Message.js';

test('message slot centers the notification without covering the whole TUI', () => {
  assert.deepEqual(messageSlotProps('warn'), {
    alignItems: 'center',
    borderColor: 'yellow',
    borderStyle: 'round',
    flexDirection: 'column',
    flexGrow: 1,
    justifyContent: 'center',
    paddingX: 1,
  });
});

test('message content lines fill the modal interior', () => {
  const lines = messageContentLines('INFO', 'Switched.', 14);

  assert.deepEqual(lines, [
    'INFO          ',
    '              ',
    'Switched.     ',
    '              ',
    'Enter: dismiss',
  ]);
  assert.equal(lines.every((line) => line.length === 14), true);
});

test('message dismisses only on enter', () => {
  assert.equal(shouldDismissMessage({ return: true }), true);
  assert.equal(shouldDismissMessage({ escape: true }), false);
  assert.equal(shouldDismissMessage({}, 'x'), false);
});
