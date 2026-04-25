/**
 * Electron main-process folder open: canonical path resolution, then show in Explorer.
 * On Windows, prefers `cmd /c start` + explorer.exe + shell.openPath fallback (kept in sync with
 * `openOutputFolder` in engines). Loads open-folder-helpers (resources/open-folder-helpers.cjs).
 */

import { shell } from 'electron';
import type { IpcMain } from 'electron';
import { execFile, spawn } from 'child_process';
import * as path from 'path';
import { resolveOpenFolderHelpersBundlePath } from './config';

export type OpenFolderMainResult = {
  success: boolean;
  openedPath?: string;
  message?: string;
};

type ResolveResult =
  | { ok: true; target: string }
  | { ok: false; message: string };

type EnsureFolderResult = { ok: true; path: string } | { ok: false; message: string };

function loadComposerOsApiHelpers(): {
  resolveOpenFolderTarget: (composerRoot: string, body?: { path?: string }) => ResolveResult;
  ensureFolderForOpen: (dir: string) => EnsureFolderResult;
} {
  const bundlePath = resolveOpenFolderHelpersBundlePath();
  if (!bundlePath) {
    throw new Error(
      'Composer OS open-folder helpers bundle is missing (resources/open-folder-helpers.cjs). Rebuild the desktop app.'
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(bundlePath) as {
    resolveOpenFolderTarget: (composerRoot: string, body?: { path?: string }) => ResolveResult;
    ensureFolderForOpen: (dir: string) => EnsureFolderResult;
  };
  return { resolveOpenFolderTarget: mod.resolveOpenFolderTarget, ensureFolderForOpen: mod.ensureFolderForOpen };
}

let cachedHelpers: ReturnType<typeof loadComposerOsApiHelpers> | null = null;

function helpers(): ReturnType<typeof loadComposerOsApiHelpers> {
  if (!cachedHelpers) cachedHelpers = loadComposerOsApiHelpers();
  return cachedHelpers;
}

export async function openOutputFolderInMain(
  composerRoot: string,
  body?: { path?: string }
): Promise<OpenFolderMainResult> {
  let resolveOpenFolderTarget: ReturnType<typeof helpers>['resolveOpenFolderTarget'];
  let ensureFolderForOpen: ReturnType<typeof helpers>['ensureFolderForOpen'];
  try {
    const h = helpers();
    resolveOpenFolderTarget = h.resolveOpenFolderTarget;
    ensureFolderForOpen = h.ensureFolderForOpen;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: msg };
  }
  const resolved = resolveOpenFolderTarget(composerRoot, body);
  if (!resolved.ok) {
    return { success: false, message: resolved.message };
  }
  const prep = ensureFolderForOpen(resolved.target);
  if (!prep.ok) {
    return { success: false, message: prep.message };
  }
  const dir = path.normalize(prep.path);
  if (process.platform === 'win32') {
    // Keep in sync with `normalizeForWindowsExplorer` in engines/.../openOutputFolder.ts
    const n = path.resolve(dir);
    const winPath = /^[A-Za-z]:\\$/.test(n) && n.length === 3 ? n : n.replace(/[/\\]+$/, '');
    console.log(
      '[OpenFolder] transport=electron-ipc',
      JSON.stringify({
        platform: 'win32',
        opener: 'openFolderMain.ts: cmd /c start (primary) then explorer.exe / shell.openPath',
        notNodeHttpApi: true,
      })
    );
    console.log('[Library] Opening folder (Electron, Windows):', winPath);
    return new Promise((resolve) => {
      execFile(
        'cmd.exe',
        ['/d', '/c', 'start', '', winPath],
        { windowsHide: false, shell: false },
        (err) => {
          if (err) {
            console.error('[Library] cmd /c start failed, trying explorer.exe:', err);
            const ch = spawn('explorer.exe', [winPath], {
              detached: true,
              stdio: 'ignore',
              windowsHide: false,
            });
            ch.once('error', (e) => {
              const msg = e instanceof Error ? e.message : String(e);
              console.error('[Library] explorer.exe failed, trying shell.openPath:', msg);
              void shell.openPath(winPath).then((e2) => {
                if (e2) {
                  resolve({ success: false, message: e2 || 'Could not open the folder in Explorer.' });
                } else {
                  console.log('[Library] Folder open finished successfully (shell.openPath).');
                  resolve({ success: true, openedPath: winPath });
                }
              });
            });
            ch.once('spawn', () => {
              ch.unref();
              console.log('[Library] Folder open finished successfully (explorer).');
              resolve({ success: true, openedPath: winPath });
            });
            return;
          }
          console.log('[Library] Folder open finished successfully (cmd start).');
          resolve({ success: true, openedPath: winPath });
        }
      );
    });
  }
  const errMsg = await shell.openPath(dir);
  if (errMsg) {
    return {
      success: false,
      message: errMsg || 'Could not open the folder in the system file manager.',
    };
  }
  console.log('[Library] Folder open (shell.openPath) OK:', dir);
  return { success: true, openedPath: dir };
}

export function registerOpenOutputFolderIpc(ipcMain: IpcMain, composerRoot: string): void {
  ipcMain.removeHandler('composer-os-api:open-output-folder');
  ipcMain.handle(
    'composer-os-api:open-output-folder',
    (_e, body: unknown): Promise<OpenFolderMainResult> =>
      openOutputFolderInMain(composerRoot, body as { path?: string } | undefined)
  );
}
