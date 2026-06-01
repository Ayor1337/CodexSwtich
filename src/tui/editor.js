import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

export async function editExternal(initialText, { suffix = '.txt' } = {}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csw-'));
  const file = path.join(tmpDir, `csw${suffix}`);
  try {
    await fs.writeFile(file, initialText, 'utf8');
    const ed = process.env.VISUAL || process.env.EDITOR || 'vi';
    const res = spawnSync(ed, [file], { stdio: 'inherit' });
    if (res.status !== 0) return { cancelled: true, text: initialText };
    const text = await fs.readFile(file, 'utf8');
    return { cancelled: false, text };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
