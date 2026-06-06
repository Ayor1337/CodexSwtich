import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { html, React } from './html.js';
import { buildCustomProfilePatch, providerFormInitialValues } from './providerForm.js';

const FIELDS = [
  { key: 'providerName', label: 'providerName', help: 'config.toml model_provider value' },
  { key: 'model', label: 'model', help: 'top-level config.toml model, optional' },
  { key: 'baseUrl', label: 'base_url', help: 'http:// or https:// endpoint' },
  { key: 'requiresOpenaiAuth', label: 'requires_openai_auth', help: 'true uses Codex auth.json' },
  { key: 'apiKey', label: 'api_key', help: 'saved as authJson.OPENAI_API_KEY' },
];

function displayValue(field, value) {
  if (field.key === 'apiKey' && value) return '*'.repeat(Math.min(12, String(value).length));
  return value || '';
}

export function ProviderAuthForm({
  label,
  profile,
  fallbackName = '',
  submitLabel = 'Save',
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = React.useState(() => providerFormInitialValues(profile, fallbackName));
  const [index, setIndex] = React.useState(0);
  const [error, setError] = React.useState(null);
  const active = FIELDS[index];

  const setField = (key, value) => {
    setError(null);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    try {
      const patch = buildCustomProfilePatch(values, { existingAuthJson: profile?.authJson });
      onSubmit(patch);
    } catch (e) {
      setError(e.message);
    }
  };

  useInput((input, key) => {
    if (key.escape) { onCancel?.(); return; }
    if (key.upArrow) { setIndex((i) => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setIndex((i) => Math.min(FIELDS.length - 1, i + 1)); return; }
    if (active.key === 'requiresOpenaiAuth') {
      if (key.leftArrow || key.rightArrow || input === ' ') {
        setField('requiresOpenaiAuth', values.requiresOpenaiAuth === 'true' ? 'false' : 'true');
      }
      if (key.return) setIndex((i) => Math.min(FIELDS.length - 1, i + 1));
      return;
    }
    if (key.return && index === FIELDS.length - 1) submit();
  });

  const activeTextInput = active.key !== 'requiresOpenaiAuth';

  return html`
    <${Box} flexDirection="column" borderStyle="round" borderColor="cyan" paddingX=${1} flexGrow=${1}>
      <${Text} color="cyan" bold>${label}</${Text}>
      <${Box} marginTop=${1} flexDirection="column">
        ${FIELDS.map((field, i) => {
          const isActive = i === index;
          const value = values[field.key] || '';
          return html`
            <${Box} key=${field.key}>
              <${Text} color=${isActive ? 'yellow' : 'cyan'}>${isActive ? '›' : ' '} ${field.label.padEnd(22)}</${Text}>
              ${isActive && activeTextInput
                ? html`<${TextInput}
                    value=${value}
                    onChange=${(v) => setField(field.key, v)}
                    onSubmit=${() => {
                      if (index < FIELDS.length - 1) setIndex(index + 1);
                      else submit();
                    }}
                  />`
                : html`<${Text}>${field.key === 'requiresOpenaiAuth' ? `[${value}]` : displayValue(field, value)}</${Text}>`}
            </${Box}>
          `;
        })}
      </${Box}>
      <${Box} marginTop=${1}><${Text} dimColor>${active.help}</${Text}></${Box}>
      ${error
        ? html`<${Box} marginTop=${1}><${Text} color="red">${error}</${Text}></${Box}>`
        : null}
      <${Box} marginTop=${1}>
        <${Text} dimColor>Up/Down: field    Space/Left/Right: toggle    Enter: next/${submitLabel}    Esc: cancel</${Text}>
      </${Box}>
    </${Box}>
  `;
}
