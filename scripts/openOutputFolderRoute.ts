/**
 * HTTP / IPC route helper: open output folder or select file in Explorer (Windows).
 * File paths use explorer.exe /select — folder-only paths fall through to apiOpenOutputFolder.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { apiOpenOutputFolder } from '../engines/composer-os-v2/app-api/composerOsApiCore';
import { isPathUnderComposerRoot } from '../engines/composer-os-v2/app-api/composerOsOutputPaths';
import type { OpenOutputFolderResult } from '../engines/composer-os-v2/app-api/openOutputFolder';

function openWindowsExplorerSelectFile(filePath: string): Promise<OpenOutputFolderResult> {
  const normalized = path.normalize(filePath);
  return new Promise((resolve) => {
    const child = spawn('explorer.exe', ['/select,', normalized], {
      detached: true,
      stdio: 'ignore',
    });
    child.once('error', (e) => {
      resolve({
        success: false,
        message: e instanceof Error ? e.message : String(e),
      });
    });
    child.once('spawn', () => {
      child.unref();
      resolve({ success: true, openedPath: normalized });
    });
  });
}

export async function openOutputFolderRoute(
  composerRoot: string,
  body?: { path?: string }
): Promise<OpenOutputFolderResult> {
  if (process.platform === 'win32' && body?.path?.trim()) {
    const resolved = path.normalize(path.resolve(body.path.trim()));
    if (isPathUnderComposerRoot(composerRoot, resolved)) {
      try {
        if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
          return openWindowsExplorerSelectFile(resolved);
        }
      } catch {
        /* fall through to folder open */
      }
    }
  }
  return apiOpenOutputFolder(composerRoot, body);
}
