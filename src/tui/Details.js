import { Box, Text } from 'ink';
import TOML from '@iarna/toml';
import { html } from './html.js';
import { profileKind } from '../profiles.js';

function maskValue(v) {
  if (typeof v !== 'string') return String(v);
  if (v.length <= 8) return '****';
  return `${v.slice(0, 3)}…${v.slice(-4)}`;
}

function maskedAuth(authJson) {
  const out = {};
  for (const [k, v] of Object.entries(authJson || {})) {
    out[k] = /key|token|secret/i.test(k) ? maskValue(v) : v;
  }
  return out;
}

export function Details({ profile }) {
  if (!profile) {
    return html`
      <${Box} flexDirection="column" borderStyle="round" borderColor="gray" paddingX=${1} flexGrow=${1}>
        <${Text} dimColor>No profile selected.</${Text}>
      </${Box}>
    `;
  }

  const kind = profileKind(profile);
  const authText = JSON.stringify(maskedAuth(profile.authJson), null, 2);

  let providerSection;
  if (kind === 'official') {
    providerSection = html`
      <${Box} marginTop=${1} flexDirection="column">
        <${Text} color="cyan">Official OpenAI auth</${Text}>
        <${Text} dimColor>(no model_provider override; uses Codex's built-in openai)</${Text}>
      </${Box}>
    `;
  } else {
    let tomlText = '';
    try { tomlText = TOML.stringify(profile.providerBlock || {}).trimEnd(); }
    catch (e) { tomlText = `(error stringifying providerBlock: ${e.message})`; }
    providerSection = html`
      <${Box} flexDirection="column">
        <${Text}>provider: <${Text} color="cyan">${profile.providerName}</${Text}></${Text}>
        <${Box} marginTop=${1} flexDirection="column">
          <${Text} dimColor>[model_providers.${profile.providerName}]</${Text}>
          ${tomlText.split('\n').map((line, i) => html`<${Text} key=${i}>  ${line}</${Text}>`)}
        </${Box}>
      </${Box}>
    `;
  }

  return html`
    <${Box} flexDirection="column" borderStyle="round" borderColor="gray" paddingX=${1} flexGrow=${1}>
      <${Box}>
        <${Text} bold>${profile.name}</${Text}>
        <${Text} dimColor>  [${kind}]</${Text}>
      </${Box}>
      ${providerSection}
      <${Box} marginTop=${1} flexDirection="column">
        <${Text} dimColor>auth.json (masked)</${Text}>
        ${authText.split('\n').map((line, i) => html`<${Text} key=${i}>  ${line}</${Text}>`)}
      </${Box}>
    </${Box}>
  `;
}
