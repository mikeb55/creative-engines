/**
 * Composer OS Desktop — single source of truth for Electron main-process config.
 * Keep strings aligned with engines/composer-os-v2/app-api/composerOsConfig.ts where applicable.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { app } from 'electron';

/** Must match engines/composer-os-v2/app-api/composerOsOutputPaths.ts (MIKE_COMPOSER_FILES_ROOT). */
const MIKE_COMPOSER_FILES_ROOT = 'Mike Composer Files';

export const DESKTOP_APP_ID = 'com.mikeb55.composeros.desktop';
export const DESKTOP_PRODUCT_NAME = 'Composer OS Desktop';
export const COMPOSER_OS_PREFERRED_PORT_DEFAULT = 3001;

export function isPackagedMode(): boolean {
  return app.isPackaged;
}

export function isDevDesktopMode(): boolean {
  return !app.isPackaged;
}

export function getResourcesPath(): string {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), 'resources');
  }
  return process.resourcesPath;
}

export function getApiBundleCandidates(): string[] {
  return [
    path.join(process.resourcesPath, 'api.bundle.js'),
    path.join(__dirname, '..', 'resources', 'api.bundle.js'),
    path.join(app.getAppPath(), 'resources', 'api.bundle.js'),
  ];
}

export function resolveApiBundlePath(): string | null {
  for (const p of getApiBundleCandidates()) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function resolveDesktopIpcBundlePath(): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'desktop-ipc.bundle.cjs'),
    path.join(__dirname, '..', 'resources', 'desktop-ipc.bundle.cjs'),
    path.join(app.getAppPath(), 'resources', 'desktop-ipc.bundle.cjs'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function getUiSearchPaths(): { packagedUi: string; devUi: string } {
  const resources = getResourcesPath();
  const packagedUi = path.join(resources, 'ui');
  const devUi = path.join(app.getAppPath(), '..', 'composer-os-app', 'dist');
  return { packagedUi, devUi };
}

export function resolveUiPath(): string {
  const { packagedUi, devUi } = getUiSearchPaths();
  if (fs.existsSync(packagedUi)) return packagedUi;
  return devUi;
}

/**
 * Composer files root (<Documents>/Mike Composer Files, or COMPOSER_OS_OUTPUT_DIR).
 * Preset-specific files go in subfolders; must stay aligned with composerOsOutputPaths.ts.
 */
export function resolveDefaultOutputDir(): string {
  const env = process.env.COMPOSER_OS_OUTPUT_DIR?.trim();
  if (env) {
    return path.resolve(env);
  }
  return path.join(os.homedir(), 'Documents', MIKE_COMPOSER_FILES_ROOT);
}

export function getWindowIconPath(): string {
  return path.join(app.getAppPath(), 'resources', 'icon.png');
}

export function getPreferredPortFromEnv(): number {
  const v = process.env.COMPOSER_OS_PREFERRED_PORT;
  if (v !== undefined && v !== '') return parseInt(v, 10);
  return COMPOSER_OS_PREFERRED_PORT_DEFAULT;
}
