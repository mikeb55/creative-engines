/**
 * Optional packaged channel file: Contents/Resources/desktop-channel.json
 * Absent, or channel other than "dev", keeps the historical Composer OS Desktop identity.
 * The dev channel is a separate app id, user-data directory, and Documents export root.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export type DesktopChannel = 'stable' | 'dev';

export const DEV_APP_ID = 'com.mikeb55.composeros.dev';
export const DEV_PRODUCT_NAME = 'Composer OS DEV';
export const DEV_USER_DATA_DIR_NAME = 'composer-os-dev';
export const DEV_DOCUMENTS_EXPORT_ROOT = 'Composer OS DEV Exports';

export function parseDesktopChannel(raw: string | null | undefined): DesktopChannel {
  if (!raw) return 'stable';
  try {
    const parsed = JSON.parse(raw) as { channel?: unknown };
    return parsed.channel === 'dev' ? 'dev' : 'stable';
  } catch {
    return 'stable';
  }
}

export function readDesktopChannelFile(filePath: string): DesktopChannel {
  try {
    if (!fs.existsSync(filePath)) return 'stable';
    return parseDesktopChannel(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return 'stable';
  }
}

export function loadDesktopChannel(): DesktopChannel {
  const resources = process.resourcesPath;
  if (typeof resources !== 'string' || resources.length === 0) return 'stable';
  return readDesktopChannelFile(path.join(resources, 'desktop-channel.json'));
}

export function desktopChannelIdentity(channel: DesktopChannel): { appId: string; productName: string } {
  if (channel === 'dev') return { appId: DEV_APP_ID, productName: DEV_PRODUCT_NAME };
  return { appId: 'com.mikeb55.composeros.desktop', productName: 'Composer OS Desktop' };
}

export function devUserDataPath(appDataDir: string): string {
  return path.join(appDataDir, DEV_USER_DATA_DIR_NAME);
}

export function devDocumentsExportRoot(): string {
  return path.join(os.homedir(), 'Documents', DEV_DOCUMENTS_EXPORT_ROOT);
}

/** Stable saves stay on the historical Documents root. Dev saves stay under a separate folder. */
export function documentsSaveBase(documentsDir: string, channel: DesktopChannel): string {
  if (channel === 'dev') return path.join(documentsDir, DEV_DOCUMENTS_EXPORT_ROOT);
  return documentsDir;
}
