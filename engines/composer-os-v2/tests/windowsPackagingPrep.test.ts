/**
 * Windows desktop packaging path — real entrypoints (Prompt 7/7).
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '../../..');

export function runWindowsPackagingPrepTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const desktopPkg = path.join(REPO, 'apps', 'composer-os-desktop', 'package.json');
  out.push({
    ok: fs.existsSync(desktopPkg),
    name: 'desktop package.json exists',
  });

  const mainTs = path.join(REPO, 'apps', 'composer-os-desktop', 'electron', 'main.ts');
  out.push({
    ok: fs.existsSync(mainTs) && fs.readFileSync(mainTs, 'utf-8').includes('loadFile'),
    name: 'Electron main entry exists',
  });

  const ipc = path.join(REPO, 'apps', 'composer-os-desktop', 'electron', 'ipcEntry.ts');
  out.push({
    ok: fs.existsSync(ipc) && fs.readFileSync(ipc, 'utf-8').includes('apiGenerate'),
    name: 'IPC bridge calls shared apiGenerate (Composer OS runtime)',
  });

  return out;
}
