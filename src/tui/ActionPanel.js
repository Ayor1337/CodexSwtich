import { Box, Text } from 'ink';
import { html } from './html.js';

export function ActionPanel({ actions, selectedIndex, focused, title = 'Actions' }) {
  return html`
    <${Box}
      flexDirection="column"
      borderStyle="round"
      borderColor=${focused ? 'cyan' : 'gray'}
      paddingX=${1}
      width=${26}
    >
      <${Text} bold color=${focused ? 'cyan' : undefined}>${title}</${Text}>
      ${actions.map((action, i) => {
        const isSel = i === selectedIndex;
        const cursor = isSel ? '›' : ' ';
        return html`
          <${Box} key=${action.id} marginTop=${i === 0 ? 1 : 0} flexDirection="column">
            <${Text} inverse=${focused && isSel} dimColor=${action.disabled}>
              ${cursor} ${action.label}
            </${Text}>
            ${action.description
              ? html`<${Text} dimColor>    ${action.description}</${Text}>`
              : null}
          </${Box}>
        `;
      })}
    </${Box}>
  `;
}
