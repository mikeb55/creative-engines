/**
 * Package-aware deploy: quarantine legacy shortcuts, create "Composer OS" desktop shortcut, verify.
 * Run after `npm run desktop:package`. Windows only.
 */
import * as fs from 'fs';
import * as path from 'path';
import { cleanupLegacyShortcuts } from './cleanupLegacyShortcuts';
import {
  createShortcut,
  getUserDesktopDir,
  isWindows,
  readShortcutTarget,
} from './shortcutUtils';
import { findCanonicalPortableExe, normalizeFsPath } from './installRules';

const SHORTCUT_NAME = 'Composer OS Desktop.lnk';

function desktopAppRoot(): string {
  return path.resolve(__dirname, '..');
}

function resolvePortableExe(): string {
  const root = desktopAppRoot();
  const releaseDir = path.join(root, 'release');
  const fileName = findCanonicalPortableExe(releaseDir);
  if (!fileName) {
    throw new Error(
      `No Composer-OS-Desktop-*-portable.exe in ${releaseDir}. Run npm run desktop:package first.`
    );
  }
  const full = path.join(releaseDir, fileName);
  if (!fs.existsSync(full)) {
    throw new Error(`Portable exe missing: ${full}`);
  }
  return path.resolve(full);
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
  if (path.basename(shortcutPath) !== SHORTCUT_NAME) {
    throw new Error(`Shortcut must be named "${SHORTCUT_NAME}"`);
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

  const portableExe = resolvePortableExe();
  const desktopDir = getUserDesktopDir();
  const shortcutPath = path.join(desktopDir, SHORTCUT_NAME);

  console.log('Composer OS desktop deploy');
  console.log('Portable exe:', portableExe);

  const cleanup = cleanupLegacyShortcuts(portableExe);
  console.log(`Scanned ${cleanup.scanned} shortcuts; quarantined ${cleanup.quarantined.length}`);
  cleanup.quarantined.forEach((line) => console.log('  ', line));
  if (cleanup.quarantined.length) {
    console.log('Quarantine folder:', cleanup.quarantineDir);
  }

  if (fs.existsSync(shortcutPath)) {
    try {
      fs.unlinkSync(shortcutPath);
    } catch (e) {
      console.warn('Could not remove existing shortcut (will try overwrite):', e);
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

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')) as {
    build?: { appId?: string; productName?: string };
  };

  console.log('');
  console.log('OK — Composer OS Desktop shortcut is ready.');
  console.log('  Product:', pkg.build?.productName ?? 'Composer OS Desktop');
  console.log('  App ID:', pkg.build?.appId ?? '(see package.json)');
  console.log('  Packaged exe:', portableExe);
  console.log('  Shortcut:', shortcutPath);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
