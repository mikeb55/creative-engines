/**
 * Open a directory in the OS file manager (Explorer / Finder / xdg-open).
 * Windows (WEB/DEV API path): primary `cmd.exe /d /c start "" <abs>` for reliable foregrounding;
 * fallback `explorer.exe <abs>`. Matches the proven Electron main pattern in `openFolderMain.ts`.
 */

import { execFile, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export type OpenOutputFolderResult = {
  success: boolean;
  openedPath?: string;
  message?: string;
};

/** Exposed for tests — strip trailing seps, keep drive root `C:\`. */
export function normalizeForWindowsExplorer(absPath: string): string {
  const n = path.resolve(absPath);
  if (/^[A-Za-z]:\\$/.test(n) && n.length === 3) {
    return n;
  }
  return n.replace(/[/\\]+$/, '');
}

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

function openWindowsWithCmdStartThenExplorer(f: string): Promise<OpenOutputFolderResult> {
  const sysroot = process.env.SystemRoot;
  const explorerPath =
    sysroot && sysroot.length > 0
      ? `${sysroot.replace(/[/\\]+$/, '')}\\explorer.exe`
      : 'explorer.exe';

  return new Promise((resolve) => {
    const tryExplorer = () => {
      console.log('[OpenFolder] fallback=explorer');
      const ex = spawn(explorerPath, [f], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });
      ex.once('error', (e) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`[OpenFolder] error=${msg}`);
        resolve({ success: false, message: `Could not open File Explorer: ${msg}` });
      });
      ex.once('spawn', () => {
        ex.unref();
        console.log('[OpenFolder] success=true');
        resolve({ success: true, openedPath: f });
      });
    };

    console.log('[OpenFolder] strategy=cmd-start');
    execFile(
      'cmd.exe',
      ['/d', '/c', 'start', '', f],
      { windowsHide: false, shell: false },
      (err) => {
        if (!err) {
          console.log('[OpenFolder] success=true');
          resolve({ success: true, openedPath: f });
          return;
        }
        console.log(`[OpenFolder] error=${err.message}`);
        tryExplorer();
      }
    );
  });
}

function openWindowsFileExplorer(absoluteDir: string): Promise<OpenOutputFolderResult> {
  const f = normalizeForWindowsExplorer(absoluteDir);
  console.log(`[OpenFolder] target=${f}`);
  const exists = fs.existsSync(f);
  console.log(`[OpenFolder] exists=${exists}`);
  console.log('[OpenFolder] platform=win32');
  if (!exists) {
    const msg = 'Folder path does not exist.';
    console.log(`[OpenFolder] error=${msg}`);
    return Promise.resolve({ success: false, message: `${msg} (${f})` });
  }
  return openWindowsWithCmdStartThenExplorer(f);
}

export async function openOutputFolder(outputDir: string): Promise<OpenOutputFolderResult> {
  const prep = ensureFolderForOpen(outputDir);
  if (!prep.ok) {
    return { success: false, message: prep.message! };
  }
  const dir = path.normalize(prep.path);

  if (process.platform === 'win32') {
    return openWindowsFileExplorer(dir);
  }
  if (process.platform === 'darwin') {
    return new Promise((resolve) => {
      const child = spawn('open', [dir], { detached: true, stdio: 'ignore' });
      child.once('error', (e) =>
        resolve({
          success: false,
          message: e instanceof Error ? e.message : 'Could not open Finder for the output folder.',
        })
      );
      child.once('spawn', () => {
        child.unref();
        resolve({ success: true, openedPath: dir });
      });
    });
  }
  return new Promise((resolve) => {
    const child = spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' });
    child.once('error', (e) =>
      resolve({
        success: false,
        message: e instanceof Error ? e.message : 'Could not open the file manager for the output folder.',
      })
    );
    child.once('spawn', () => {
      child.unref();
      resolve({ success: true, openedPath: dir });
    });
  });
}
