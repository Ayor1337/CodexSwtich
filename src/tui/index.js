import { render } from 'ink';
import { React } from './html.js';
import { App } from './App.js';
import { detectActiveProfile } from '../profiles.js';

class Controller {
  constructor(state) {
    this.state = state;
    this.selectedIndex = 0;
    this.focus = 'profiles';
    this.actionIndex = 0;
    this.mode = 'browse';
    this.pending = {};
    this.message = null;
    this.detectedActive = null;
  }
}

export async function renderTui(initialState) {
  const ctrl = new Controller(initialState);
  ctrl.detectedActive = await detectActiveProfile(ctrl.state);

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
