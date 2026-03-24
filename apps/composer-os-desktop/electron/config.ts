/**
 * Composer OS Desktop — single source of truth for Electron main-process config.
 * Keep strings aligned with engines/composer-os-v2/app-api/composerOsConfig.ts where applicable.
 */

import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

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

export function resolveDefaultOutputDir(): string {
  if (!app.isPackaged) {
    return path.resolve(app.getAppPath(), '..', '..', 'outputs', 'composer-os-v2');
  }
  return path.join(app.getPath('userData'), 'outputs', 'composer-os-v2');
}

export function getWindowIconPath(): string {
  return path.join(app.getAppPath(), 'resources', 'icon.png');
}

export function getPreferredPortFromEnv(): number {
  const v = process.env.COMPOSER_OS_PREFERRED_PORT;
  if (v !== undefined && v !== '') return parseInt(v, 10);
  return COMPOSER_OS_PREFERRED_PORT_DEFAULT;
}
