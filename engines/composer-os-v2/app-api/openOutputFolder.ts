/**
 * Composer OS V2 — App API: open output folder (no visible shell window on Windows)
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface OpenOutputFolderResult {
  success: boolean;
  message?: string;
}

export function openOutputFolder(outputDir: string): Promise<OpenOutputFolderResult> {
  return new Promise((resolve) => {
    const dir = path.resolve(outputDir);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (e) {
      resolve({
        success: false,
        message: `Composer OS could not create or access the output folder. Check disk space and permissions. (${String(e)})`,
      });
      return;
    }
    if (!fs.existsSync(dir)) {
      resolve({
        success: false,
        message: 'The output folder does not exist and could not be created.',
      });
      return;
    }
    try {
      fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      resolve({
        success: false,
        message: 'The output folder exists but is not writable. Choose another location or fix folder permissions.',
      });
      return;
    }

    if (process.platform === 'win32') {
      const child = spawn('explorer.exe', [dir], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.on('error', () =>
        resolve({
          success: false,
          message: 'Could not open File Explorer for the output folder.',
        })
      );
      child.unref();
      resolve({ success: true });
      return;
    }
    if (process.platform === 'darwin') {
      const child = spawn('open', [dir], { detached: true, stdio: 'ignore' });
      child.on('error', () =>
        resolve({
          success: false,
          message: 'Could not open Finder for the output folder.',
        })
      );
      child.unref();
      resolve({ success: true });
      return;
    }
    const child = spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' });
    child.on('error', () =>
      resolve({
        success: false,
        message: 'Could not open the file manager for the output folder.',
      })
    );
    child.unref();
    resolve({ success: true });
  });
}
