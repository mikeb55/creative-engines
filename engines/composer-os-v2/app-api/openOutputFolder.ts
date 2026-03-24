/**
 * Open a directory in the OS file manager (Explorer / Finder / xdg-open).
 * Electron desktop uses shell.openPath in main process; this path is for Node/HTTP.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export type OpenOutputFolderResult = {
  success: boolean;
  openedPath?: string;
  message?: string;
};

/** Ensure folder exists and is readable/writable; shared with Electron main. */
export function ensureFolderForOpen(outputDir: string):
  | { ok: true; path: string }
  | { ok: false; message: string } {
  const dir = path.resolve(outputDir);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    return {
      ok: false,
      message: `Composer OS could not create or access the output folder. Check disk space and permissions. (${String(e)})`,
    };
  }
  if (!fs.existsSync(dir)) {
    return {
      ok: false,
      message: 'The output folder does not exist and could not be created.',
    };
  }
  try {
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    return {
      ok: false,
      message:
        'The output folder exists but is not writable. Choose another location or fix folder permissions.',
    };
  }
  return { ok: true, path: dir };
}

export function openOutputFolder(outputDir: string): Promise<OpenOutputFolderResult> {
  return new Promise((resolve) => {
    const prep = ensureFolderForOpen(outputDir);
    if (!prep.ok) {
      resolve({ success: false, message: prep.message });
      return;
    }
    const dir = prep.path;

    if (process.platform === 'win32') {
      const child = spawn('explorer.exe', [dir], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.once('error', () =>
        resolve({
          success: false,
          message: 'Could not open File Explorer for the output folder.',
        })
      );
      child.once('spawn', () => {
        child.unref();
        resolve({ success: true, openedPath: dir });
      });
      return;
    }
    if (process.platform === 'darwin') {
      const child = spawn('open', [dir], { detached: true, stdio: 'ignore' });
      child.once('error', () =>
        resolve({
          success: false,
          message: 'Could not open Finder for the output folder.',
        })
      );
      child.once('spawn', () => {
        child.unref();
        resolve({ success: true, openedPath: dir });
      });
      return;
    }
    const child = spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' });
    child.once('error', () =>
      resolve({
        success: false,
        message: 'Could not open the file manager for the output folder.',
      })
    );
    child.once('spawn', () => {
      child.unref();
      resolve({ success: true, openedPath: dir });
    });
  });
}
