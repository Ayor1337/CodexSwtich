import { Box, Text } from 'ink';
import { html } from './html.js';

const BROWSE = '↑↓/jk move   ⏎ switch   a add   e edit   r rename   d delete   i import   q quit';
const EDIT_CUSTOM = 'n name   p provider   t providerBlock(TOML)   j authJson(JSON)   Esc back';
const EDIT_OFFICIAL = 'n name   j authJson(JSON)   Esc back';

export function HelpBar({ mode, selKind }) {
  let text = BROWSE;
  if (mode === 'edit-menu') text = selKind === 'official' ? EDIT_OFFICIAL : EDIT_CUSTOM;
  return html`
    <${Box} paddingX=${1}>
      <${Text} dimColor>${text}</${Text}>
    </${Box}>
  `;
}
