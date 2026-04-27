/**
 * Electron main-process folder open: canonical path resolution + shell.openPath.
 * Loads a packaged-safe esbuild bundle (resources/open-folder-helpers.cjs), not loose engine paths.
 */

import { shell } from 'electron';
import type { IpcMain } from 'electron';
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
  const dir =
    process.platform === 'win32'
      ? path.normalize(prep.path).replace(/\//g, '\\')
      : path.normalize(prep.path);
  const errMsg = await shell.openPath(dir);
  if (errMsg) {
    return {
      success: false,
      message: errMsg || 'Could not open the folder in the system file manager.',
    };
  }
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
