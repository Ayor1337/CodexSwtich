import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { html, React } from './html.js';

export function TextPrompt({ label, defaultValue = '', validate, onSubmit, onCancel }) {
  const [value, setValue] = React.useState(defaultValue);
  const [error, setError] = React.useState(null);

  useInput((input, key) => {
    if (key.escape) onCancel?.();
  });

  const submit = (v) => {
    const result = validate ? validate(v) : true;
    if (result === true) {
      onSubmit(v);
    } else {
      setError(typeof result === 'string' ? result : 'invalid');
    }
  };

  return html`
    <${Box} flexDirection="column" borderStyle="round" borderColor="cyan" paddingX=${1}>
      <${Text} color="cyan" bold>${label}</${Text}>
      <${Box} marginTop=${1}>
        <${Text}>› </${Text}>
        <${TextInput} value=${value} onChange=${setValue} onSubmit=${submit} />
      </${Box}>
      ${error
        ? html`<${Box} marginTop=${1}><${Text} color="red">${error}</${Text}></${Box}>`
        : null}
      <${Box} marginTop=${1}><${Text} dimColor>Enter: confirm    Esc: cancel</${Text}></${Box}>
    </${Box}>
  `;
}
