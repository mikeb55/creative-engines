/**
 * Composer OS V2 — App API: open output folder
 */

import { exec } from 'child_process';
import * as path from 'path';

export function openOutputFolder(outputDir: string): Promise<boolean> {
  return new Promise((resolve) => {
    const dir = path.resolve(outputDir);
    const command = process.platform === 'win32' ? `explorer "${dir}"` : process.platform === 'darwin' ? `open "${dir}"` : `xdg-open "${dir}"`;
    exec(command, (err) => {
      resolve(!err);
    });
  });
}
