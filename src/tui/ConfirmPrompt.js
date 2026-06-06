import { Box, Text, useInput } from 'ink';
import { html } from './html.js';

export function ConfirmPrompt({ label, defaultYes = false, onAnswer }) {
  useInput((input, key) => {
    if (key.escape) { onAnswer(false); return; }
    if (key.return) { onAnswer(defaultYes); return; }
    const c = (input || '').toLowerCase();
    if (c === 'y') onAnswer(true);
    else if (c === 'n') onAnswer(false);
  });

  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  return html`
    <${Box} flexDirection="column" borderStyle="round" borderColor="yellow" paddingX=${1} flexGrow=${1}>
      <${Text} color="yellow" bold>${label}</${Text}>
      <${Box} marginTop=${1}><${Text} dimColor>${hint}    y: yes    n: no    Esc: cancel</${Text}></${Box}>
    </${Box}>
  `;
}
