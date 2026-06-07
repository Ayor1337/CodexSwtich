import { render } from 'ink';
import { React } from './html.js';
import { App } from './App.js';
import { detectProfileSyncStatus, findProfile, profileKind } from '../profiles.js';

class Controller {
  constructor(state) {
    this.state = state;
    this.selectedIndex = 0;
    this.focus = 'profiles';
    this.actionIndex = 0;
    this.mode = 'browse';
    this.pending = {};
    this.message = null;
    this.profileStatus = null;
  }
}

export function shouldResolveOfficialDrift(state, profileStatus) {
  const active = profileStatus.activeName
    ? findProfile(state, profileStatus.activeName)
    : null;
  return (
    profileStatus.syncStatus === 'not sync' &&
    active &&
    profileKind(active) === 'official'
  );
}

export async function renderTui(initialState) {
  const ctrl = new Controller(initialState);
  ctrl.profileStatus = await detectProfileSyncStatus(ctrl.state);
  if (shouldResolveOfficialDrift(ctrl.state, ctrl.profileStatus)) {
    ctrl.mode = 'resolve-sync';
    ctrl.pending = {
      name: ctrl.profileStatus.activeName,
      defaultName: `official-${new Date().toISOString().slice(0, 10)}`,
    };
  }

  // Surface any startup message set by cli.js bootstrap (first-run auto-import etc.).
  if (initialState.__bootMessage) {
    ctrl.mode = 'message';
    ctrl.message = { kind: initialState.__bootMessage.kind, text: initialState.__bootMessage.text };
    delete initialState.__bootMessage;
  }

  const app = render(React.createElement(App, {
    ctrl,
    onQuit: () => { app.unmount(); },
  }));

  await app.waitUntilExit();
}
