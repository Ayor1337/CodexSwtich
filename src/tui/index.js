import { render } from 'ink';
import { React } from './html.js';
import { App } from './App.js';
import { editExternal } from './editor.js';
import { detectActiveProfile } from '../profiles.js';

class Controller {
  constructor(state) {
    this.state = state;
    this.selectedIndex = 0;
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

  for (;;) {
    let editorReq = null;
    let quit = false;

    const app = render(React.createElement(App, {
      ctrl,
      onEditor: (req) => { editorReq = req; app.unmount(); },
      onQuit: () => { quit = true; app.unmount(); },
    }));

    await app.waitUntilExit();

    if (quit) break;
    if (!editorReq) break;

    // run external editor (Ink is unmounted, TTY restored)
    let result;
    try {
      result = await editExternal(editorReq.initialText, editorReq.opts);
    } catch (e) {
      result = { cancelled: true, text: editorReq.initialText, error: e.message };
    }

    // handler advances ctrl state (may set message mode, pending, etc.)
    try {
      await editorReq.handler(result);
    } catch (e) {
      ctrl.mode = 'message';
      ctrl.message = { kind: 'error', text: `Editor handler failed: ${e.message}` };
    }
    // loop re-mounts Ink
  }
}
