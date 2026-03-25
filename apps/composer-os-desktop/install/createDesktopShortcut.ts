/**
 * Create or update the user Desktop shortcut to the latest packaged portable exe.
 * Does not run UI verification, legacy shortcut scans, or launch the app (use full install for that).
 */
import * as fs from 'fs';
import * as path from 'path';
import { normalizeFsPath } from './installRules';
import { desktopReleaseDir, verifyPackagedPortableExe } from './verifyPackagedDesktop';
import { createShortcut, getUserDesktopDir, isWindows, readShortcutTarget } from './shortcutUtils';

export const SHORTCUT_DISPLAY_NAME = 'Composer OS';
export const SHORTCUT_FILE_NAME = `${SHORTCUT_DISPLAY_NAME}.lnk`;

export function createOrUpdateComposerOsDesktopShortcut(desktopAppRoot: string): {
  portableExe: string;
  shortcutPath: string;
} {
  if (!isWindows()) {
    throw new Error(
      'desktop:create-shortcut is Windows-only. Use the packaged portable exe on a Windows machine.'
    );
  }

  const { absolutePath: portableExe } = verifyPackagedPortableExe(desktopReleaseDir(desktopAppRoot));
  const desktopDir = getUserDesktopDir();
  const shortcutPath = path.join(desktopDir, SHORTCUT_FILE_NAME);

  if (fs.existsSync(shortcutPath)) {
    try {
      const prev = readShortcutTarget(shortcutPath);
      if (normalizeFsPath(prev) !== normalizeFsPath(portableExe)) {
        fs.unlinkSync(shortcutPath);
      }
    } catch {
      try {
        fs.unlinkSync(shortcutPath);
      } catch (e) {
        console.warn('Could not remove existing shortcut (will try overwrite):', e);
      }
    }
  }

  createShortcut({
    shortcutPath,
    targetPath: portableExe,
    workingDirectory: path.dirname(portableExe),
    iconPath: portableExe,
  });

  return { portableExe, shortcutPath };
}
