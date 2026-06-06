import { Box, Text } from 'ink';
import { html } from './html.js';
import { profileKind } from '../profiles.js';

function maskValue(v) {
  if (typeof v !== 'string') return String(v);
  if (v.length <= 8) return '****';
  return `${v.slice(0, 3)}…${v.slice(-4)}`;
}

function isRecord(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function formatValue(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  try { return JSON.stringify(v); }
  catch { return String(v); }
}

function flattenEntries(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => flattenEntries(item, prefix ? `${prefix}.${i}` : String(i)));
  }
  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, item]) => (
      flattenEntries(item, prefix ? `${prefix}.${key}` : key)
    ));
  }
  return prefix ? [{ key: prefix, value }] : [];
}

export function detailRows(value, { maskSensitive = false } = {}) {
  return flattenEntries(value).map(({ key, value: raw }) => ({
    key,
    value: maskSensitive && /key|token|secret/i.test(key) ? maskValue(raw) : formatValue(raw),
  }));
}

export function DetailTable({ rows }) {
  if (!rows.length) {
    return html`<${Text} dimColor>  none</${Text}>`;
  }
  const keyWidth = Math.min(28, Math.max(...rows.map((row) => row.key.length)));
  return html`
    <${Box} flexDirection="column">
      ${rows.map((row) => html`
        <${Box} key=${row.key}>
          <${Text} color="cyan">${row.key.padEnd(keyWidth)}</${Text}>
          <${Text} dimColor>  │  </${Text}>
          <${Text}>${row.value}</${Text}>
        </${Box}>
      `)}
    </${Box}>
  `;
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
  const authRows = detailRows(profile.authJson || {}, { maskSensitive: true });

  let providerSection;
  if (kind === 'official') {
    providerSection = html`
      <${Box} marginTop=${1} flexDirection="column">
        <${Text} color="cyan">Official OpenAI auth</${Text}>
        <${Text} dimColor>(no model_provider override; uses Codex's built-in openai)</${Text}>
      </${Box}>
    `;
  } else {
    const providerRows = detailRows(profile.providerBlock || {});
    providerSection = html`
      <${Box} flexDirection="column">
        <${Text}>provider: <${Text} color="cyan">${profile.providerName}</${Text}></${Text}>
        ${profile.model
          ? html`<${Text}>model: <${Text} color="cyan">${profile.model}</${Text}></${Text}>`
          : html`<${Text}>model: <${Text} dimColor>(none)</${Text}></${Text}>`}
        <${Box} marginTop=${1} flexDirection="column">
          <${Text} dimColor>[model_providers.${profile.providerName}]</${Text}>
          <${DetailTable} rows=${providerRows} />
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
        <${DetailTable} rows=${authRows} />
      </${Box}>
    </${Box}>
  `;
}
