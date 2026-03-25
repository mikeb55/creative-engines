/**
 * Package-aware deploy: verify UI, quarantine legacy shortcuts, create "Composer OS" shortcut, launch.
 * Invoked after `npm run desktop:package` (e.g. `npm run desktop:clean-install`). Windows only.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { cleanupLegacyShortcuts } from './cleanupLegacyShortcuts';
import { installComposerOsDesktopIcon, SHORTCUT_FILE_NAME } from './installDesktopIcon';
import { getResolvedUserDesktopDir, isWindows, readShortcutTarget } from './shortcutUtils';
import { normalizeFsPath } from './installRules';
import { desktopReleaseDir, verifyPackagedPortableExe } from './verifyPackagedDesktop';

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

  const root = desktopAppRoot();
  const { absolutePath: portableExe } = verifyPackagedPortableExe(desktopReleaseDir(root));

  const cleanup = cleanupLegacyShortcuts(portableExe);
  if (cleanup.quarantined.length) {
    console.log(`Quarantined ${cleanup.quarantined.length} shortcut(s); scanned ${cleanup.scanned}`);
    cleanup.quarantined.forEach((line) => console.log(' ', line));
    console.log('Quarantine folder:', cleanup.quarantineDir);
  }

  const r = installComposerOsDesktopIcon(root, { portableExe });
  if (path.basename(r.shortcutPath) !== SHORTCUT_FILE_NAME) {
    throw new Error(`Shortcut must be named "${SHORTCUT_FILE_NAME}"`);
  }
  if (normalizeFsPath(r.desktopDir) !== normalizeFsPath(getResolvedUserDesktopDir())) {
    throw new Error('Desktop folder mismatch after install icon step.');
  }

  verifyNoLegacyOnDesktop(r.desktopDir);

  console.log('');
  console.log('Packaged exe:', r.portableExe);
  console.log('Shortcut:', r.shortcutPath);
  console.log('Launched:', r.launched ? 'yes' : 'no');
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
