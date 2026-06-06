import { Box, Text, useInput } from 'ink';
import { html } from './html.js';

// options: [{ key: 'o', label: 'Official', value: 'official', description?: '...' }, ...]
export function SelectPrompt({ label, options, onSelect, onCancel }) {
  useInput((input, key) => {
    if (key.escape) { onCancel?.(); return; }
    const c = (input || '').toLowerCase();
    const hit = options.find((o) => o.key.toLowerCase() === c);
    if (hit) onSelect(hit.value);
  });

  return html`
    <${Box} flexDirection="column" borderStyle="round" borderColor="cyan" paddingX=${1} flexGrow=${1}>
      <${Text} color="cyan" bold>${label}</${Text}>
      <${Box} marginTop=${1} flexDirection="column">
        ${options.map((o) => html`
          <${Box} key=${o.key} flexDirection="column">
            <${Text}>  <${Text} color="yellow" bold>${o.key}</${Text}>  ${o.label}</${Text}>
            ${o.description
              ? html`<${Text} dimColor>      ${o.description}</${Text}>`
              : null}
          </${Box}>
        `)}
      </${Box}>
      <${Box} marginTop=${1}><${Text} dimColor>Esc: cancel</${Text}></${Box}>
    </${Box}>
  `;
}
