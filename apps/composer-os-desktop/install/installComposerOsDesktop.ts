/**
 * Package-aware deploy: verify UI, quarantine legacy shortcuts, create "Composer OS Desktop" shortcut, launch.
 * Invoked after `npm run desktop:package` (e.g. `npm run desktop:clean-install`). Windows only.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { cleanupLegacyShortcuts } from './cleanupLegacyShortcuts';
import { launchInstalledDesktopApp } from './launchInstalledDesktopApp';
import {
  createShortcut,
  getUserDesktopDir,
  isWindows,
  readShortcutTarget,
} from './shortcutUtils';
import { normalizeFsPath } from './installRules';
import { desktopReleaseDir, verifyPackagedPortableExe } from './verifyPackagedDesktop';

const SHORTCUT_DISPLAY_NAME = 'Composer OS Desktop';
const SHORTCUT_FILE_NAME = `${SHORTCUT_DISPLAY_NAME}.lnk`;

function desktopAppRoot(): string {
  return path.resolve(__dirname, '..');
}

function verifyUiResourcesStamp(): void {
  const root = desktopAppRoot();
  const script = path.join(root, 'scripts', 'verify-ui-after-copy.js');
  if (!fs.existsSync(script)) {
    throw new Error(`Missing UI verification script: ${script}`);
  }
  execFileSync(process.execPath, [script], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
}

function verifyShortcut(shortcutPath: string, canonicalExe: string): void {
  if (!fs.existsSync(shortcutPath)) {
    throw new Error(`Shortcut missing: ${shortcutPath}`);
  }
  const target = readShortcutTarget(shortcutPath);
  if (normalizeFsPath(target) !== normalizeFsPath(canonicalExe)) {
    throw new Error(
      `Shortcut target mismatch.\nExpected: ${canonicalExe}\nGot: ${target}`
    );
  }
  const base = path.basename(shortcutPath);
  if (base !== SHORTCUT_FILE_NAME) {
    throw new Error(`Shortcut must be named "${SHORTCUT_FILE_NAME}"`);
  }
}

function verifyNoLegacyOnDesktop(desktopDir: string): void {
  const bad: string[] = [];
  let entries: string[];
  try {
    entries = fs.readdirSync(desktopDir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (!name.toLowerCase().endsWith('.lnk')) continue;
    const full = path.join(desktopDir, name);
    let target = '';
    try {
      target = readShortcutTarget(full);
    } catch {
      continue;
    }
    const lower = name.toLowerCase();
    if (lower.includes('composer studio') || lower.includes('composer-studio')) {
      bad.push(full);
    }
  }
  if (bad.length > 0) {
    throw new Error(
      `Legacy Composer-related shortcuts still on Desktop after cleanup: ${bad.join('; ')}`
    );
  }
}

function main(): void {
  if (!isWindows()) {
    console.error('installComposerOsDesktop: Windows only.');
    process.exit(1);
  }

  verifyUiResourcesStamp();

  const { absolutePath: portableExe } = verifyPackagedPortableExe(desktopReleaseDir(desktopAppRoot()));
  const desktopDir = getUserDesktopDir();
  const shortcutPath = path.join(desktopDir, SHORTCUT_FILE_NAME);

  const cleanup = cleanupLegacyShortcuts(portableExe);
  if (cleanup.quarantined.length) {
    console.log(`Quarantined ${cleanup.quarantined.length} shortcut(s); scanned ${cleanup.scanned}`);
    cleanup.quarantined.forEach((line) => console.log(' ', line));
    console.log('Quarantine folder:', cleanup.quarantineDir);
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

  verifyShortcut(shortcutPath, portableExe);
  verifyNoLegacyOnDesktop(desktopDir);

  const launch = launchInstalledDesktopApp(portableExe);

  if (launch.launched) {
    if (normalizeFsPath(launch.launchTarget) !== normalizeFsPath(portableExe)) {
      throw new Error(
        `Launch target does not match packaged exe.\nExe: ${portableExe}\nLaunch: ${launch.launchTarget}`
      );
    }
  }

  console.log('');
  console.log('Packaged exe:', portableExe);
  console.log('Shortcut:', shortcutPath);
  console.log('Launched:', launch.launched ? 'yes' : 'no');

  if (!launch.launched) {
    throw new Error(`Failed to launch packaged app: ${launch.reason}`);
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
