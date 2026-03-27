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
import { COMPOSER_OS_V1_SUPPORTED_MODES, type SupportedModeInfo } from './releaseMetadata';
import { getStyleModules } from './getStyleModules';
import { getPresets } from './getPresets';
import type { AppPreset, AppStyleModule } from './appApiTypes';

export interface DiagnosticsPayload {
  appName: string;
  version: string;
  supportedModes: readonly SupportedModeInfo[];
  /** Same registry as `/presets` and IPC `get-presets` (for packaged app debugging). */
  registeredPresets: readonly AppPreset[];
  apiBasePath: string;
  activePort: number;
  /** When desktop uses IPC, this is 0 and desktopTransport is "ipc". */
  desktopTransport?: 'ipc' | 'http';
  outputDirectory: string;
  outputDirectoryDisplay: string;
  outputDirectoryExists: boolean;
  outputDirectoryWritable: boolean;
  backendReachable: true;
  styleModules: AppStyleModule[];
}

function toDisplayPath(p: string): string {
  const n = path.normalize(p);
  if (process.platform === 'win32') return n.replace(/\//g, '\\');
  return n;
}

export function buildDiagnostics(
  outputDir: string,
  activePort: number,
  opts?: { desktopTransport?: 'ipc' | 'http' }
): DiagnosticsPayload {
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
    supportedModes: COMPOSER_OS_V1_SUPPORTED_MODES,
    registeredPresets: getPresets(),
    apiBasePath: COMPOSER_OS_API_BASE_PATH,
    activePort,
    desktopTransport: opts?.desktopTransport,
    outputDirectory: resolved,
    outputDirectoryDisplay: toDisplayPath(resolved),
    outputDirectoryExists: fs.existsSync(resolved),
    outputDirectoryWritable: writable,
    backendReachable: true,
    styleModules: getStyleModules(),
  };
}
