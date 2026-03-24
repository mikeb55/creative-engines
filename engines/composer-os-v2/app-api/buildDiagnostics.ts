/**
 * Composer OS — diagnostics payload for /api/diagnostics
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  COMPOSER_OS_APP_NAME,
  COMPOSER_OS_VERSION,
  COMPOSER_OS_API_BASE_PATH,
} from './composerOsConfig';

export interface DiagnosticsPayload {
  appName: string;
  version: string;
  apiBasePath: string;
  activePort: number;
  outputDirectory: string;
  outputDirectoryDisplay: string;
  outputDirectoryExists: boolean;
  outputDirectoryWritable: boolean;
  backendReachable: true;
}

function toDisplayPath(p: string): string {
  const n = path.normalize(p);
  if (process.platform === 'win32') return n.replace(/\//g, '\\');
  return n;
}

export function buildDiagnostics(outputDir: string, activePort: number): DiagnosticsPayload {
  const resolved = path.resolve(outputDir);
  const exists = fs.existsSync(resolved);
  let writable = false;
  if (exists) {
    try {
      fs.accessSync(resolved, fs.constants.W_OK);
      writable = true;
    } catch {
      writable = false;
    }
  } else {
    try {
      fs.mkdirSync(resolved, { recursive: true });
      writable = true;
    } catch {
      writable = false;
    }
  }

  return {
    appName: COMPOSER_OS_APP_NAME,
    version: COMPOSER_OS_VERSION,
    apiBasePath: COMPOSER_OS_API_BASE_PATH,
    activePort,
    outputDirectory: resolved,
    outputDirectoryDisplay: toDisplayPath(resolved),
    outputDirectoryExists: fs.existsSync(resolved),
    outputDirectoryWritable: writable,
    backendReachable: true,
  };
}
