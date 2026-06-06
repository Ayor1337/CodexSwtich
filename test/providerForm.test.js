import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCustomProfilePatch,
  providerFormInitialValues,
} from '../src/tui/providerForm.js';

test('builds custom provider patch from table values', () => {
  const patch = buildCustomProfilePatch({
    providerName: 'proxy',
    model: 'gpt-5.5',
    baseUrl: 'https://proxy.example.test/v1',
    requiresOpenaiAuth: 'true',
    apiKey: 'sk-test',
  });

  assert.deepEqual(patch, {
    providerName: 'proxy',
    model: 'gpt-5.5',
    providerBlock: {
      base_url: 'https://proxy.example.test/v1',
      wire_api: 'responses',
      requires_openai_auth: true,
    },
    authJson: {
      OPENAI_API_KEY: 'sk-test',
    },
  });
});

test('stores empty model as null', () => {
  const patch = buildCustomProfilePatch({
    providerName: 'proxy',
    model: '   ',
    baseUrl: 'https://proxy.example.test/v1',
    requiresOpenaiAuth: 'false',
    apiKey: 'sk-test',
  });

  assert.equal(patch.model, null);
});

test('rejects invalid provider form values', () => {
  assert.throws(() => buildCustomProfilePatch({
    providerName: 'openai',
    baseUrl: 'https://proxy.example.test/v1',
    apiKey: 'sk-test',
  }), /reserved/);

  assert.throws(() => buildCustomProfilePatch({
    providerName: 'proxy',
    baseUrl: 'ftp://proxy.example.test',
    apiKey: 'sk-test',
  }), /base_url/);

  assert.throws(() => buildCustomProfilePatch({
    providerName: 'proxy',
    baseUrl: 'https://proxy.example.test/v1',
    apiKey: '',
  }), /api_key/);
});

test('derives initial table values from an existing profile', () => {
  assert.deepEqual(providerFormInitialValues({
    name: 'proxy-profile',
    providerName: 'proxy',
    model: 'gpt-5.5',
    providerBlock: {
      base_url: 'https://proxy.example.test/v1',
      wire_api: 'responses',
      requires_openai_auth: true,
    },
    authJson: { OPENAI_API_KEY: 'sk-test' },
  }), {
    providerName: 'proxy',
    model: 'gpt-5.5',
    baseUrl: 'https://proxy.example.test/v1',
    requiresOpenaiAuth: 'true',
    apiKey: 'sk-test',
  });
});
