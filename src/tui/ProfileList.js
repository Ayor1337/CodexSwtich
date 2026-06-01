import { Box, Text } from 'ink';
import { html } from './html.js';
import { profileKind } from '../profiles.js';

export function ProfileList({ profiles, activeName, selectedIndex }) {
  return html`
    <${Box} flexDirection="column" borderStyle="round" borderColor="gray" paddingX=${1} width=${32}>
      <${Text} bold>Profiles</${Text}>
      ${profiles.length === 0
        ? html`<${Text} dimColor>(none — press 'a' or 'i')</${Text}>`
        : profiles.map((p, i) => {
            const isActive = p.name === activeName;
            const isSel = i === selectedIndex;
            const marker = isActive ? '*' : ' ';
            const cursor = isSel ? '›' : ' ';
            const color = isActive ? 'green' : undefined;
            const tag = profileKind(p) === 'official' ? 'o' : 'c';
            return html`
              <${Text} key=${p.name} inverse=${isSel} color=${color}>
                ${cursor} ${marker} [${tag}] ${p.name}
              </${Text}>`;
          })}
    </${Box}>
  `;
}
