import { Box, Text } from 'ink';
import { html } from './html.js';
import { profileKind } from '../profiles.js';

export function ProfileList({ profiles, activeName, selectedIndex, focused = false }) {
  return html`
    <${Box}
      flexDirection="column"
      borderStyle="round"
      borderColor=${focused ? 'cyan' : 'gray'}
      paddingX=${1}
      width=${28}
    >
      <${Text} bold color=${focused ? 'cyan' : undefined}>Profiles</${Text}>
      ${profiles.length === 0
        ? html`<${Text} dimColor>(none — choose Add or Import)</${Text}>`
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
