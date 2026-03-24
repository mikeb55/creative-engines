/**
 * Composer OS V2 — App API: open output folder (no visible shell window on Windows)
 */

import { spawn } from 'child_process';
import * as path from 'path';

export function openOutputFolder(outputDir: string): Promise<boolean> {
  return new Promise((resolve) => {
    const dir = path.resolve(outputDir);
    if (process.platform === 'win32') {
      const child = spawn('explorer.exe', [dir], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.on('error', () => resolve(false));
      child.unref();
      resolve(true);
      return;
    }
    if (process.platform === 'darwin') {
      const child = spawn('open', [dir], { detached: true, stdio: 'ignore' });
      child.on('error', () => resolve(false));
      child.unref();
      resolve(true);
      return;
    }
    const child = spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.unref();
    resolve(true);
  });
}
