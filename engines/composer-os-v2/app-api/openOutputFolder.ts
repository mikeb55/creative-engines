/**
 * Open a directory/file location in the OS file manager (Explorer / Finder / xdg-open).
 * Windows (WEB/DEV API path): use direct explorer.exe launch.
 */

import { spawn } from 'child_process';
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

function openWindowsOpenFolder(folderPath: string): Promise<OpenOutputFolderResult> {
  const f = normalizeForWindowsExplorer(folderPath);
  const sysroot = process.env.SystemRoot;
  const explorerPath =
    sysroot && sysroot.length > 0
      ? `${sysroot.replace(/[/\\]+$/, '')}\\explorer.exe`
      : 'explorer.exe';

  return new Promise((resolve) => {
    console.log(`[OpenFolder] command=${explorerPath} "${f}"`);
    const child = spawn(explorerPath, [f], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.once('error', (e) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[OpenFolder] error=${msg}`);
      resolve({ success: false, message: `Could not open File Explorer: ${msg}` });
    });
    child.once('spawn', () => {
      child.unref();
      console.log('[OpenFolder] success=true');
      resolve({ success: true, openedPath: f });
    });
  });
}

function openWindowsSelectFile(filePath: string): Promise<OpenOutputFolderResult> {
  const f = normalizeForWindowsExplorer(filePath);
  const selectArg = `/select,${f}`;
  return new Promise((resolve) => {
    const sysroot = process.env.SystemRoot;
    const explorerPath =
      sysroot && sysroot.length > 0
        ? `${sysroot.replace(/[/\\]+$/, '')}\\explorer.exe`
        : 'explorer.exe';
    console.log(`[OpenFolder] command=${explorerPath} ${selectArg}`);
    const child = spawn(explorerPath, [selectArg], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.once('error', (e) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[OpenFolder] error=${msg}`);
      resolve({ success: false, message: `Could not open File Explorer for file selection: ${msg}` });
    });
    child.once('spawn', () => {
      child.unref();
      console.log('[OpenFolder] success=true');
      resolve({ success: true, openedPath: f });
    });
  });
}

function openWindowsFileExplorer(absoluteTarget: string): Promise<OpenOutputFolderResult> {
  const f = normalizeForWindowsExplorer(absoluteTarget);
  console.log(`[OpenFolder] target=${f}`);
  const exists = fs.existsSync(f);
  console.log(`[OpenFolder] exists=${exists}`);
  console.log('[OpenFolder] platform=win32');
  if (exists) {
    try {
      const stat = fs.statSync(f);
      if (stat.isFile()) {
        return openWindowsSelectFile(f);
      }
      if (stat.isDirectory()) {
        return openWindowsOpenFolder(f);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[OpenFolder] error=${msg}`);
      return Promise.resolve({ success: false, message: `Could not inspect target path: ${msg}` });
    }
  }
  const prep = ensureFolderForOpen(f);
  if (!prep.ok) {
    console.log(`[OpenFolder] error=${prep.message}`);
    return Promise.resolve({ success: false, message: prep.message });
  }
  return openWindowsOpenFolder(normalizeForWindowsExplorer(prep.path));
}

export async function openOutputFolder(outputDir: string): Promise<OpenOutputFolderResult> {
  console.log('[API][openOutputFolder.ts] entry', { outputDir, platform: process.platform });
  if (process.platform === 'win32') {
    return openWindowsFileExplorer(path.normalize(path.resolve(outputDir)));
  }
  const prep = ensureFolderForOpen(outputDir);
  if (!prep.ok) return { success: false, message: prep.message! };
  const dir = path.normalize(prep.path);
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
