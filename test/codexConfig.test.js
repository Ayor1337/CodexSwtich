import test from 'node:test';
import assert from 'node:assert/strict';
import { applyProfileToConfig } from '../src/codex.js';

test('custom profile writes model provider block and model', () => {
  const parsed = {
    model: 'old-model',
    model_provider: 'old',
    model_providers: {
      old: { base_url: 'https://old.example.test' },
    },
  };

  applyProfileToConfig(parsed, {
    kind: 'custom',
    providerName: 'proxy',
    model: 'gpt-5.5',
    providerBlock: {
      base_url: 'https://proxy.example.test/v1',
      wire_api: 'responses',
    },
  });

  assert.equal(parsed.model, 'gpt-5.5');
  assert.equal(parsed.model_provider, 'proxy');
  assert.deepEqual(parsed.model_providers.proxy, {
    base_url: 'https://proxy.example.test/v1',
    wire_api: 'responses',
  });
});

test('custom profile without model deletes existing top-level model', () => {
  const parsed = { model: 'existing-model' };

  applyProfileToConfig(parsed, {
    kind: 'custom',
    providerName: 'proxy',
    model: null,
    providerBlock: {
      base_url: 'https://proxy.example.test/v1',
      wire_api: 'responses',
    },
  });

  assert.equal(parsed.model, undefined);
});

test('official profile deletes model provider and model overrides', () => {
  const parsed = {
    model: 'old-model',
    model_provider: 'proxy',
    model_providers: {
      proxy: { base_url: 'https://proxy.example.test/v1' },
    },
  };

  applyProfileToConfig(parsed, {
    kind: 'official',
    authJson: { OPENAI_API_KEY: 'sk-test' },
  });

  assert.equal(parsed.model, undefined);
  assert.equal(parsed.model_provider, undefined);
  assert.deepEqual(parsed.model_providers, {
    proxy: { base_url: 'https://proxy.example.test/v1' },
  });
});
