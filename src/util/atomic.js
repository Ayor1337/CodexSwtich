import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export async function writeFileAtomic(target, data, { mode } = {}) {
  const dir = path.dirname(target);
  const tmp = path.join(dir, `.${path.basename(target)}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`);
  const fh = await fs.open(tmp, 'w', mode ?? 0o600);
  try {
    await fh.writeFile(data);
    if (mode != null) await fh.chmod(mode);
    await fh.sync();
  } finally {
    await fh.close();
  }
  await fs.rename(tmp, target);
}
