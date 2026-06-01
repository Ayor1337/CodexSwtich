import { Box, Text, useInput } from 'ink';
import { html } from './html.js';

const COLOR = { info: 'green', error: 'red', warn: 'yellow' };

export function Message({ kind = 'info', text, onDismiss }) {
  useInput(() => onDismiss?.());
  const color = COLOR[kind] || 'white';
  return html`
    <${Box} flexDirection="column" borderStyle="round" borderColor=${color} paddingX=${1}>
      <${Text} color=${color} bold>${kind.toUpperCase()}</${Text}>
      <${Box} marginTop=${1}><${Text}>${text}</${Text}></${Box}>
      <${Box} marginTop=${1}><${Text} dimColor>Press any key to dismiss.</${Text}></${Box}>
    </${Box}>
  `;
}
