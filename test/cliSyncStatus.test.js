import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function makeFixture({ active = 'openai', profileAuth, liveAuth }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'csw-cli-'));
  const home = path.join(root, 'home');
  const xdg = path.join(root, 'xdg');
  await fs.mkdir(path.join(home, '.codex'), { recursive: true });
  await fs.mkdir(path.join(xdg, 'csw'), { recursive: true });
  await fs.writeFile(
    path.join(home, '.codex', 'auth.json'),
    JSON.stringify(liveAuth, null, 2) + '\n',
  );
  await fs.writeFile(path.join(home, '.codex', 'config.toml'), '');
  await fs.writeFile(
    path.join(xdg, 'csw', 'profiles.json'),
    JSON.stringify({
      version: 1,
      active,
      profiles: [
        {
          name: 'openai',
          kind: 'official',
          authJson: profileAuth,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    }, null, 2) + '\n',
  );
  return { home, xdg };
}

async function runCli(args, fixture) {
  try {
    const result = await execFileAsync(
      process.execPath,
      ['bin/codex-switch.js', ...args],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          HOME: fixture.home,
          XDG_CONFIG_HOME: fixture.xdg,
        },
      },
    );
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (e) {
    return {
      code: e.code,
      stdout: e.stdout,
      stderr: e.stderr,
    };
  }
}

test('current reports not sync for drifted stored active profile', async () => {
  const fixture = await makeFixture({
    profileAuth: { OPENAI_API_KEY: 'sk-old' },
    liveAuth: { OPENAI_API_KEY: 'sk-new' },
  });

  const result = await runCli(['current'], fixture);

  assert.equal(result.code, 1);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'openai (not sync)\n');
});

test('list marks stored active as not sync when live auth drifted', async () => {
  const fixture = await makeFixture({
    profileAuth: { OPENAI_API_KEY: 'sk-old' },
    liveAuth: { OPENAI_API_KEY: 'sk-new' },
  });

  const result = await runCli(['list'], fixture);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, '* openai  (official) (not sync)\n');
});
