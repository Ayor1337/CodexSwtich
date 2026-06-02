import { Box, Text } from 'ink';
import { html } from './html.js';

const BROWSE = 'Tab focus   ↑↓/jk move   ⏎ run selected   Esc/q quit';
const EDIT_MENU = 'Tab focus   ↑↓/jk move   ⏎ run selected   Esc back';

export function HelpBar({ mode }) {
  let text = BROWSE;
  if (mode === 'edit-menu') text = EDIT_MENU;
  return html`
    <${Box} paddingX=${1}>
      <${Text} dimColor>${text}</${Text}>
    </${Box}>
  `;
}
