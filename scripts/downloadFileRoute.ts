/**
 * HTTP route helper: stream a library file as a browser attachment download.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';
import { isPathUnderComposerRoot } from '../engines/composer-os-v2/app-api/composerOsOutputPaths';

export type DownloadFileResolveResult =
  | { ok: true; absolutePath: string; fileName: string }
  | { ok: false; status: number; message: string };

export function resolveDownloadFileTarget(
  composerRoot: string,
  filePathRaw: string | undefined,
): DownloadFileResolveResult {
  const trimmed = filePathRaw?.trim();
  if (!trimmed) {
    return { ok: false, status: 400, message: 'Missing path query parameter.' };
  }
  const resolved = path.normalize(path.resolve(trimmed));
  if (!isPathUnderComposerRoot(composerRoot, resolved)) {
    return {
      ok: false,
      status: 403,
      message: 'That file is not part of your Composer OS output library.',
    };
  }
  try {
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return { ok: false, status: 404, message: 'File not found.' };
    }
  } catch (e) {
    return {
      ok: false,
      status: 500,
      message: e instanceof Error ? e.message : String(e),
    };
  }
  return { ok: true, absolutePath: resolved, fileName: path.basename(resolved) };
}

export function sendDownloadFile(res: Response, absolutePath: string, fileName: string): void {
  res.download(absolutePath, fileName);
}
