import test from 'node:test';
import assert from 'node:assert/strict';
import { detailRows } from '../src/tui/Details.js';

test('detail rows flatten top-level values', () => {
  assert.deepEqual(detailRows({
    base_url: 'https://example.test',
    wire_api: 'responses',
    requires_openai_auth: true,
  }), [
    { key: 'base_url', value: 'https://example.test' },
    { key: 'wire_api', value: 'responses' },
    { key: 'requires_openai_auth', value: 'true' },
  ]);
});

test('detail rows flatten nested objects with dot paths', () => {
  assert.deepEqual(detailRows({
    tokens: {
      access_token: 'access-token-value',
      expires_at: 123,
    },
  }), [
    { key: 'tokens.access_token', value: 'access-token-value' },
    { key: 'tokens.expires_at', value: '123' },
  ]);
});

test('detail rows flatten arrays with indexes', () => {
  assert.deepEqual(detailRows({
    headers: [
      { name: 'x-api-version', value: 'v1' },
      'plain',
    ],
  }), [
    { key: 'headers.0.name', value: 'x-api-version' },
    { key: 'headers.0.value', value: 'v1' },
    { key: 'headers.1', value: 'plain' },
  ]);
});

test('detail rows mask sensitive paths when requested', () => {
  assert.deepEqual(detailRows({
    OPENAI_API_KEY: 'sk-1234567890',
    tokens: {
      access_token: 'access-token-value',
      refresh_token: 'short',
    },
    base_url: 'https://example.test',
  }, { maskSensitive: true }), [
    { key: 'OPENAI_API_KEY', value: 'sk-…7890' },
    { key: 'tokens.access_token', value: 'acc…alue' },
    { key: 'tokens.refresh_token', value: '****' },
    { key: 'base_url', value: 'https://example.test' },
  ]);
});

test('detail rows return no rows for empty objects', () => {
  assert.deepEqual(detailRows({}), []);
});
