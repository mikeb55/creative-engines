/**
 * Electron main-process folder open: canonical path resolution + shell.openPath.
 * Loads engine helpers via require() so tsc rootDir (electron/) stays self-contained.
 */

import { shell } from 'electron';
import type { IpcMain } from 'electron';
import * as path from 'path';

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
  const modPath = path.join(__dirname, '../../../engines/composer-os-v2/app-api/composerOsOutputPaths.js');
  const openPath = path.join(__dirname, '../../../engines/composer-os-v2/app-api/openOutputFolder.js');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { resolveOpenFolderTarget } = require(modPath) as {
    resolveOpenFolderTarget: (composerRoot: string, body?: { path?: string }) => ResolveResult;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ensureFolderForOpen } = require(openPath) as {
    ensureFolderForOpen: (dir: string) => EnsureFolderResult;
  };
  return { resolveOpenFolderTarget, ensureFolderForOpen };
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
  const { resolveOpenFolderTarget, ensureFolderForOpen } = helpers();
  const resolved = resolveOpenFolderTarget(composerRoot, body);
  if (!resolved.ok) {
    return { success: false, message: resolved.message };
  }
  const prep = ensureFolderForOpen(resolved.target);
  if (!prep.ok) {
    return { success: false, message: prep.message };
  }
  const dir = prep.path;
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
