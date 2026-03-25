/**
 * Single path: resolve latest portable exe, one Desktop .lnk, verify, optional launch.
 * Primary Desktop = Windows Known Folder (user), resolved with realpath.
 */
import * as fs from 'fs';
import * as path from 'path';
import { normalizeFsPath } from './installRules';
import { desktopReleaseDir, verifyPackagedPortableExe } from './verifyPackagedDesktop';
import {
  createShortcut,
  getResolvedUserDesktopDir,
  isWindows,
  readShortcutTarget,
} from './shortcutUtils';
import { launchInstalledDesktopApp } from './launchInstalledDesktopApp';

export const SHORTCUT_CANONICAL_NAME = 'Composer OS';
export const SHORTCUT_FILE_NAME = `${SHORTCUT_CANONICAL_NAME}.lnk`;
/** Older full-install name; removed so only one product icon remains. */
export const LEGACY_SHORTCUT_FILE_NAME = 'Composer OS Desktop.lnk';

export type InstallIconResult = {
  portableExe: string;
  shortcutPath: string;
  launched: boolean;
  desktopDir: string;
};

export type InstallIconOptions = {
  /** Skip spawning the app (e.g. unit tests). */
  skipLaunch?: boolean;
  /** When set, skips verifyPackagedPortableExe (caller already verified). */
  portableExe?: string;
};

function resolvePortableExe(desktopAppRoot: string, portableExeOpt?: string): string {
  if (portableExeOpt) {
    const resolved = path.resolve(portableExeOpt);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Portable exe not found: ${resolved}`);
    }
    return resolved;
  }
  return verifyPackagedPortableExe(desktopReleaseDir(desktopAppRoot)).absolutePath;
}

/**
 * Creates or updates exactly `Composer OS.lnk` on the real user Desktop, removes legacy duplicate name, verifies target, launches.
 */
export function installComposerOsDesktopIcon(
  desktopAppRoot: string,
  opts?: InstallIconOptions
): InstallIconResult {
  if (!isWindows()) {
    throw new Error('desktop:install-icon requires Windows.');
  }

  const portableExe = resolvePortableExe(desktopAppRoot, opts?.portableExe);
  const desktopDir = getResolvedUserDesktopDir();
  const shortcutPath = path.join(desktopDir, SHORTCUT_FILE_NAME);
  const legacyPath = path.join(desktopDir, LEGACY_SHORTCUT_FILE_NAME);

  if (fs.existsSync(legacyPath)) {
    try {
      fs.unlinkSync(legacyPath);
    } catch (e) {
      throw new Error(
        `Failed to remove legacy shortcut "${legacyPath}": ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

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
        throw new Error(
          `Could not replace stale shortcut ${shortcutPath}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  }

  createShortcut({
    shortcutPath,
    targetPath: portableExe,
    workingDirectory: path.dirname(portableExe),
    iconPath: portableExe,
  });

  if (!fs.existsSync(shortcutPath)) {
    throw new Error(`FAIL: Shortcut file missing after create: ${shortcutPath}`);
  }
  const target = readShortcutTarget(shortcutPath);
  if (normalizeFsPath(target) !== normalizeFsPath(portableExe)) {
    throw new Error(
      `FAIL: Shortcut target mismatch.\nExpected: ${portableExe}\nGot: ${target}`
    );
  }

  let launched = false;
  if (!opts?.skipLaunch) {
    const launch = launchInstalledDesktopApp(portableExe);
    if (!launch.launched) {
      throw new Error(`FAIL: Launch failed: ${launch.reason}`);
    }
    launched = true;
  }

  return { portableExe, shortcutPath, launched, desktopDir };
}
