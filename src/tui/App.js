import { Box, Text, useApp, useInput } from 'ink';
import TOML from '@iarna/toml';
import { html, React } from './html.js';
import { ProfileList } from './ProfileList.js';
import { Details } from './Details.js';
import { ActionPanel } from './ActionPanel.js';
import { HelpBar } from './HelpBar.js';
import { TextPrompt } from './TextPrompt.js';
import { ConfirmPrompt } from './ConfirmPrompt.js';
import { Message } from './Message.js';
import { SelectPrompt } from './SelectPrompt.js';
import {
  addProfile,
  updateProfile,
  renameProfile,
  deleteProfile,
  findProfile,
  buildProfileFromCurrent,
  detectActiveProfile,
  validateOfficialAuth,
  NAME_RE,
} from '../profiles.js';
import { saveProfiles } from '../store.js';
import { switchTo } from '../switcher.js';
import { readAuth, readConfig } from '../codex.js';
import { buildActionItems } from './actions.js';

const TOML_TEMPLATE = `name = ""
wire_api = "responses"
requires_openai_auth = true
base_url = ""
`;
const JSON_TEMPLATE = `{
  "OPENAI_API_KEY": ""
}
`;

export function App({ ctrl, onEditor, onQuit }) {
  const { exit } = useApp();
  const [, setTick] = React.useState(0);
  const force = () => setTick((t) => t + 1);

  const profiles = ctrl.state.profiles;
  const sel = profiles[ctrl.selectedIndex] || null;
  const detected = ctrl.detectedActive;

  // ---- helpers ----
  const showMessage = (kind, text) => {
    ctrl.message = { kind, text, prevMode: ctrl.mode };
    ctrl.mode = 'message';
    force();
  };

  const refreshDetected = async () => {
    ctrl.detectedActive = await detectActiveProfile(ctrl.state);
    force();
  };

  const goBrowse = () => { ctrl.mode = 'browse'; ctrl.pending = {}; force(); };

  // After-save hook: refresh detected, message, return to browse
  const finalizeAdd = async (switchNow) => {
    const profile = ctrl.pending.kind === 'official'
      ? {
          name: ctrl.pending.name,
          kind: 'official',
          authJson: ctrl.pending.authJson,
        }
      : {
          name: ctrl.pending.name,
          kind: 'custom',
          providerName: ctrl.pending.providerName,
          providerBlock: ctrl.pending.providerBlock,
          authJson: ctrl.pending.authJson,
        };
    try {
      addProfile(ctrl.state, profile);
      await saveProfiles(ctrl.state);
    } catch (e) {
      showMessage('error', e.message);
      return;
    }
    if (switchNow) {
      try {
        await switchTo(ctrl.state, profile.name, { onCollision: async () => true });
      } catch (e) {
        showMessage('error', `Added but switch failed: ${e.message}`);
        await refreshDetected();
        return;
      }
    }
    await refreshDetected();
    ctrl.selectedIndex = ctrl.state.profiles.findIndex((p) => p.name === profile.name);
    showMessage('info', switchNow ? `Added and switched to "${profile.name}".` : `Added profile "${profile.name}".`);
  };

  const actionItems = buildActionItems({ profile: sel, mode: ctrl.mode });
  if (ctrl.actionIndex >= actionItems.length) ctrl.actionIndex = Math.max(0, actionItems.length - 1);

  const switchSelected = async () => {
    if (!sel) return;
    try {
      await switchTo(ctrl.state, sel.name, {
        onCollision: async () => true, // TODO: surface a real confirm modal
      });
      await refreshDetected();
      showMessage('info', `Switched to "${sel.name}".`);
    } catch (e) {
      showMessage('error', e.message);
    }
  };

  const editProviderBlock = () => {
    if (!sel) return;
    onEditor({
      initialText: (() => { try { return TOML.stringify(sel.providerBlock); } catch { return TOML_TEMPLATE; } })(),
      opts: { suffix: '.toml' },
      handler: async (res) => {
        if (res.cancelled) { goBrowse(); return; }
        let parsed;
        try {
          parsed = TOML.parse(res.text);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('TOML must be a table');
        } catch (e) {
          showMessage('error', `TOML parse failed: ${e.message}`); return;
        }
        try {
          updateProfile(ctrl.state, sel.name, { providerBlock: parsed });
          await saveProfiles(ctrl.state);
        } catch (e) { showMessage('error', e.message); return; }
        await refreshDetected();
        showMessage('info', `Updated providerBlock for "${sel.name}".`);
      },
    });
  };

  const editAuthJson = () => {
    if (!sel) return;
    onEditor({
      initialText: JSON.stringify(sel.authJson, null, 2) + '\n',
      opts: { suffix: '.json' },
      handler: async (res) => {
        if (res.cancelled) { goBrowse(); return; }
        let parsed;
        try {
          parsed = JSON.parse(res.text);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Must be a JSON object');
        } catch (e) { showMessage('error', `JSON parse failed: ${e.message}`); return; }
        try {
          updateProfile(ctrl.state, sel.name, { authJson: parsed });
          await saveProfiles(ctrl.state);
        } catch (e) { showMessage('error', e.message); return; }
        await refreshDetected();
        showMessage('info', `Updated authJson for "${sel.name}".`);
      },
    });
  };

  const runAction = (id) => {
    if (id === 'switch') { switchSelected(); return; }
    if (id === 'add') { ctrl.mode = 'add:kind'; ctrl.pending = {}; force(); return; }
    if (id === 'import') {
      ctrl.mode = 'import:name';
      ctrl.pending = { defaultName: `imported-${new Date().toISOString().slice(0, 10)}` };
      force(); return;
    }
    if (id === 'quit') { onQuit(); return; }
    if (id === 'edit') { if (sel) { ctrl.mode = 'edit-menu'; ctrl.focus = 'actions'; ctrl.actionIndex = 0; force(); } return; }
    if (id === 'rename') { if (sel) { ctrl.mode = 'rename'; ctrl.pending = { name: sel.name }; force(); } return; }
    if (id === 'delete') {
      if (!sel) return;
      if (profiles.length <= 1) { showMessage('warn', 'Refusing to delete the only profile.'); return; }
      ctrl.mode = 'confirm-delete'; ctrl.pending = { name: sel.name }; force(); return;
    }
    if (id === 'back') { goBrowse(); return; }
    if (id === 'edit-name') { if (sel) { ctrl.mode = 'edit:rename'; force(); } return; }
    if (id === 'edit-provider') { if (sel) { ctrl.mode = 'edit:provider'; force(); } return; }
    if (id === 'edit-provider-block') { editProviderBlock(); return; }
    if (id === 'edit-auth') { editAuthJson(); return; }
  };

  // ---- input handler ----
  useInput((input, key) => {
    if (ctrl.mode !== 'browse' && ctrl.mode !== 'edit-menu') return; // prompts have their own input

    if (key.tab || key.shiftTab) {
      ctrl.focus = ctrl.focus === 'profiles' ? 'actions' : 'profiles';
      force(); return;
    }

    if (key.escape) {
      if (ctrl.mode === 'edit-menu') goBrowse();
      else onQuit();
      return;
    }
    if (input === 'q' && ctrl.mode === 'browse') { onQuit(); return; }

    if (key.upArrow || input === 'k') {
      if (ctrl.focus === 'actions') {
        if (actionItems.length) ctrl.actionIndex = (ctrl.actionIndex - 1 + actionItems.length) % actionItems.length;
      } else if (profiles.length) {
        ctrl.selectedIndex = (ctrl.selectedIndex - 1 + profiles.length) % profiles.length;
      }
      force(); return;
    }

    if (key.downArrow || input === 'j') {
      if (ctrl.focus === 'actions') {
        if (actionItems.length) ctrl.actionIndex = (ctrl.actionIndex + 1) % actionItems.length;
      } else if (profiles.length) {
        ctrl.selectedIndex = (ctrl.selectedIndex + 1) % profiles.length;
      }
      force(); return;
    }

    if (key.return) {
      if (ctrl.focus === 'profiles' && ctrl.mode === 'browse') {
        switchSelected();
        return;
      }
      const action = actionItems[ctrl.actionIndex];
      if (action && !action.disabled) runAction(action.id);
    }
  });

  // ---- render ----
  const layout = html`
    <${Box} flexDirection="column" minHeight=${process.stdout.rows || 24}>
      <${Box} paddingX=${1}>
        <${Text} bold color="magenta">codex-switch </${Text}>
        <${Text}>— Active: </${Text}>
        <${Text} color="green">${detected ?? '(none)'}</${Text}>
        ${detected && ctrl.state.active && detected !== ctrl.state.active
          ? html`<${Text} color="yellow"> [drifted from stored: ${ctrl.state.active}]</${Text}>`
          : null}
        ${!detected && ctrl.state.active
          ? html`<${Text} color="yellow"> [stored: ${ctrl.state.active}, but ~/.codex doesn't match]</${Text}>`
          : null}
      </${Box}>
      <${Box} flexGrow=${1}>
        <${ProfileList}
          profiles=${profiles}
          activeName=${detected}
          selectedIndex=${ctrl.selectedIndex}
          focused=${ctrl.focus === 'profiles'}
        />
        ${ctrl.mode === 'message'
          ? html`<${Message}
              kind=${ctrl.message.kind}
              text=${ctrl.message.text}
              onDismiss=${() => { ctrl.mode = 'browse'; ctrl.message = null; force(); }}
            />`
          : html`<${Details} profile=${sel} />`}
        <${ActionPanel}
          actions=${actionItems}
          selectedIndex=${ctrl.actionIndex}
          focused=${ctrl.focus === 'actions'}
          title=${ctrl.mode === 'edit-menu' ? 'Edit Profile' : 'Actions'}
        />
      </${Box}>
      ${ctrl.mode === 'message'
        ? html`<${Box} paddingX=${1}><${Text} dimColor>Enter: dismiss</${Text}></${Box}>`
        : html`<${HelpBar} mode=${ctrl.mode === 'edit-menu' ? 'edit-menu' : 'browse'} />`}
    </${Box}>
  `;

  // ---- modal overlays ----
  if (ctrl.mode === 'message') {
    return layout;
  }

  if (ctrl.mode === 'add:kind') {
    return html`<${SelectPrompt}
      label="New profile — kind"
      options=${[
        { key: 'o', label: 'Official OpenAI auth', value: 'official',
          description: 'Captures the current ~/.codex/auth.json (run `codex login` first). No model_provider override.' },
        { key: 'c', label: 'Custom provider', value: 'custom',
          description: 'Sets model_provider and installs a [model_providers.X] block (e.g. tokenflux, ollama, a proxy).' },
      ]}
      onSelect=${(v) => { ctrl.pending.kind = v; ctrl.mode = 'add:name'; force(); }}
      onCancel=${goBrowse}
    />`;
  }
  if (ctrl.mode === 'add:name') {
    const isOfficial = ctrl.pending.kind === 'official';
    return html`<${TextPrompt}
      label=${isOfficial ? 'New official profile — name' : 'New custom profile — name'}
      validate=${(v) => {
        if (!NAME_RE.test(v)) return 'allowed: A-Z a-z 0-9 _ . -';
        if (findProfile(ctrl.state, v)) return `"${v}" already exists`;
        return true;
      }}
      onSubmit=${async (v) => {
        ctrl.pending.name = v;
        if (isOfficial) {
          // Capture the current ~/.codex/auth.json directly — no manual edit.
          let auth, parsed;
          try {
            auth = await readAuth();
            ({ parsed } = await readConfig());
          } catch (e) {
            showMessage('error', `Could not read ~/.codex state: ${e.message}`); return;
          }
          if (!auth) {
            showMessage('error', '~/.codex/auth.json is missing. Run `codex login` first.');
            return;
          }
          try { validateOfficialAuth(auth, parsed); }
          catch (e) { showMessage('error', e.message); return; }
          ctrl.pending.authJson = auth;
          ctrl.mode = 'add:confirm-switch';
          force();
        } else {
          ctrl.mode = 'add:provider';
          force();
        }
      }}
      onCancel=${goBrowse}
    />`;
  }
  if (ctrl.mode === 'add:provider') {
    return html`<${TextPrompt}
      label="providerName (TOML model_provider value)"
      defaultValue=${ctrl.pending.name}
      validate=${(v) => NAME_RE.test(v) ? true : 'allowed: A-Z a-z 0-9 _ . -'}
      onSubmit=${(v) => {
        ctrl.pending.providerName = v;
        // drop to editor for providerBlock TOML
        onEditor({
          initialText: TOML_TEMPLATE,
          opts: { suffix: '.toml' },
          handler: async (res) => {
            if (res.cancelled) { goBrowse(); return; }
            try {
              const parsed = TOML.parse(res.text);
              if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('TOML must be a table');
              ctrl.pending.providerBlock = parsed;
              // next: authJson editor
              onEditor({
                initialText: JSON_TEMPLATE,
                opts: { suffix: '.json' },
                handler: async (res2) => {
                  if (res2.cancelled) { goBrowse(); return; }
                  try {
                    const auth = JSON.parse(res2.text);
                    if (!auth || typeof auth !== 'object' || Array.isArray(auth)) throw new Error('Must be a JSON object');
                    ctrl.pending.authJson = auth;
                    ctrl.mode = 'add:confirm-switch';
                    force();
                  } catch (e) { showMessage('error', `JSON parse failed: ${e.message}`); }
                },
              });
            } catch (e) { showMessage('error', `TOML parse failed: ${e.message}`); }
          },
        });
      }}
      onCancel=${goBrowse}
    />`;
  }
  if (ctrl.mode === 'add:confirm-switch') {
    return html`<${ConfirmPrompt}
      label=${`Switch to "${ctrl.pending.name}" now?`}
      defaultYes=${false}
      onAnswer=${(yes) => finalizeAdd(yes)}
    />`;
  }

  if (ctrl.mode === 'rename') {
    return html`<${TextPrompt}
      label=${`Rename "${ctrl.pending.name}" to`}
      defaultValue=${ctrl.pending.name}
      validate=${(v) => {
        if (!NAME_RE.test(v)) return 'allowed: A-Z a-z 0-9 _ . -';
        if (v !== ctrl.pending.name && findProfile(ctrl.state, v)) return `"${v}" already exists`;
        return true;
      }}
      onSubmit=${async (v) => {
        if (v === ctrl.pending.name) { goBrowse(); return; }
        try {
          renameProfile(ctrl.state, ctrl.pending.name, v);
          await saveProfiles(ctrl.state);
        } catch (e) { showMessage('error', e.message); return; }
        await refreshDetected();
        ctrl.selectedIndex = ctrl.state.profiles.findIndex((p) => p.name === v);
        showMessage('info', `Renamed to "${v}".`);
      }}
      onCancel=${goBrowse}
    />`;
  }

  if (ctrl.mode === 'confirm-delete') {
    const name = ctrl.pending.name;
    const isActive = name === detected;
    return html`<${ConfirmPrompt}
      label=${`Delete "${name}"?${isActive ? ' (it is currently active; ~/.codex left as-is)' : ''}`}
      defaultYes=${false}
      onAnswer=${async (yes) => {
        if (!yes) { goBrowse(); return; }
        try {
          deleteProfile(ctrl.state, name);
          await saveProfiles(ctrl.state);
        } catch (e) { showMessage('error', e.message); return; }
        ctrl.selectedIndex = Math.max(0, Math.min(ctrl.selectedIndex, ctrl.state.profiles.length - 1));
        await refreshDetected();
        showMessage('info', `Deleted "${name}".`);
      }}
    />`;
  }

  if (ctrl.mode === 'import:name') {
    return html`<${TextPrompt}
      label="Import current ~/.codex state — profile name"
      defaultValue=${ctrl.pending.defaultName}
      validate=${(v) => {
        if (!NAME_RE.test(v)) return 'allowed: A-Z a-z 0-9 _ . -';
        if (findProfile(ctrl.state, v)) return `"${v}" already exists`;
        return true;
      }}
      onSubmit=${async (v) => {
        let p;
        try { p = await buildProfileFromCurrent(v); }
        catch (e) { showMessage('error', e.message); return; }
        try { addProfile(ctrl.state, p); await saveProfiles(ctrl.state); }
        catch (e) { showMessage('error', e.message); return; }
        ctrl.selectedIndex = ctrl.state.profiles.findIndex((pp) => pp.name === v);
        await refreshDetected();
        showMessage('info', `Imported as "${v}".`);
      }}
      onCancel=${goBrowse}
    />`;
  }

  if (ctrl.mode === 'edit:rename') {
    return html`<${TextPrompt}
      label=${`Rename "${sel.name}" to`}
      defaultValue=${sel.name}
      validate=${(v) => {
        if (!NAME_RE.test(v)) return 'allowed: A-Z a-z 0-9 _ . -';
        if (v !== sel.name && findProfile(ctrl.state, v)) return `"${v}" already exists`;
        return true;
      }}
      onSubmit=${async (v) => {
        if (v === sel.name) { goBrowse(); return; }
        try { renameProfile(ctrl.state, sel.name, v); await saveProfiles(ctrl.state); }
        catch (e) { showMessage('error', e.message); return; }
        await refreshDetected();
        ctrl.selectedIndex = ctrl.state.profiles.findIndex((p) => p.name === v);
        showMessage('info', `Renamed to "${v}".`);
      }}
      onCancel=${() => { ctrl.mode = 'edit-menu'; force(); }}
    />`;
  }
  if (ctrl.mode === 'edit:provider') {
    return html`<${TextPrompt}
      label=${`providerName for "${sel.name}"`}
      defaultValue=${sel.providerName}
      validate=${(v) => NAME_RE.test(v) ? true : 'allowed: A-Z a-z 0-9 _ . -'}
      onSubmit=${async (v) => {
        try { updateProfile(ctrl.state, sel.name, { providerName: v }); await saveProfiles(ctrl.state); }
        catch (e) { showMessage('error', e.message); return; }
        await refreshDetected();
        showMessage('info', `Updated providerName.`);
      }}
      onCancel=${() => { ctrl.mode = 'edit-menu'; force(); }}
    />`;
  }

  return layout;
}
