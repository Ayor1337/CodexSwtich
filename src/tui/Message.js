import { Box, Text, useInput } from 'ink';
import { html } from './html.js';

const COLOR = { info: 'green', error: 'red', warn: 'yellow' };
const CONTENT_WIDTH = 28;

export function messageSlotProps(kind = 'info') {
  return {
    alignItems: 'center',
    borderColor: COLOR[kind] || 'white',
    borderStyle: 'round',
    flexDirection: 'column',
    flexGrow: 1,
    justifyContent: 'center',
    paddingX: 1,
  };
}

export function shouldDismissMessage(key = {}) {
  return key.return === true;
}

function fitLine(text, width) {
  const value = String(text ?? '');
  return value.length > width ? value.slice(0, width) : value.padEnd(width, ' ');
}

export function messageContentLines(kind, text, width = CONTENT_WIDTH) {
  return [
    fitLine(kind, width),
    fitLine('', width),
    fitLine(text, width),
    fitLine('', width),
    fitLine('Enter: dismiss', width),
  ];
}

export function Message({ kind = 'info', text, onDismiss }) {
  useInput((input, key) => {
    if (shouldDismissMessage(key, input)) setTimeout(() => onDismiss?.(), 0);
  });
  const color = COLOR[kind] || 'white';
  const slot = messageSlotProps(kind);
  const [titleLine, blankTop, textLine, blankBottom, hintLine] = messageContentLines(kind.toUpperCase(), text);
  return html`
    <${Box} ...${slot}>
      <${Text} color=${color} bold>${titleLine}</${Text}>
      <${Text}>${blankTop}</${Text}>
      <${Text}>${textLine}</${Text}>
      <${Text}>${blankBottom}</${Text}>
      <${Text} dimColor>${hintLine}</${Text}>
    </${Box}>
  `;
}
