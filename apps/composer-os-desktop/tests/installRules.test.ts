/**
 * Pure rules for legacy shortcut detection (no Windows shell).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  findCanonicalPortableExe,
  isCleanDesktopShortcutName,
  isLegacyOrForbiddenTarget,
  isLegacyProductShortcutName,
  looksLikeComposerOsPackagedExe,
  normalizeFsPath,
  shouldQuarantineShortcut,
} from '../install/installRules';

describe('installRules', () => {
  it('isLegacyProductShortcutName detects Studio / composer-studio naming', () => {
    expect(isLegacyProductShortcutName('Composer Studio.lnk')).toBe(true);
    expect(isLegacyProductShortcutName('composer-studio-app.lnk')).toBe(true);
    expect(isLegacyProductShortcutName('Composer OS.lnk')).toBe(false);
  });

  it('isCleanDesktopShortcutName matches Composer OS and Composer OS Desktop', () => {
    expect(isCleanDesktopShortcutName('Composer OS.lnk')).toBe(true);
    expect(isCleanDesktopShortcutName('Composer OS Desktop.lnk')).toBe(true);
    expect(isCleanDesktopShortcutName('composer os desktop.lnk')).toBe(true);
    expect(isCleanDesktopShortcutName('Composer OS (old).lnk')).toBe(false);
  });

  it('isLegacyOrForbiddenTarget flags composer-studio paths', () => {
    expect(isLegacyOrForbiddenTarget('C:\\apps\\composer-studio\\app.exe')).toBe(true);
    expect(isLegacyOrForbiddenTarget('D:\\composer_studio\\x.exe')).toBe(true);
    expect(isLegacyOrForbiddenTarget('C:\\release\\Composer-OS-Desktop-1.0.0-portable.exe')).toBe(false);
  });

  it('looksLikeComposerOsPackagedExe recognizes portable / setup patterns', () => {
    expect(looksLikeComposerOsPackagedExe('C:\\r\\Composer-OS-Desktop-1.0.0-portable.exe')).toBe(true);
    expect(looksLikeComposerOsPackagedExe('C:\\composer-os-desktop\\dist\\x.exe')).toBe(true);
    expect(looksLikeComposerOsPackagedExe('C:\\Windows\\notepad.exe')).toBe(false);
  });

  it('shouldQuarantineShortcut removes legacy names regardless of target', () => {
    const canon = 'C:\\r\\Composer-OS-Desktop-1.0.0-portable.exe';
    expect(shouldQuarantineShortcut('Composer Studio.lnk', canon, canon)).toBe(true);
  });

  it('shouldQuarantineShortcut removes Composer OS shortcut when target is not canonical portable', () => {
    const canon = 'C:\\r\\Composer-OS-Desktop-2.0.0-portable.exe';
    expect(
      shouldQuarantineShortcut('Composer OS.lnk', 'C:\\old\\Composer-OS-Desktop-1.0.0-portable.exe', canon)
    ).toBe(true);
    expect(shouldQuarantineShortcut('Composer OS.lnk', canon, canon)).toBe(false);
  });

  it('normalizeFsPath lowercases for comparison', () => {
    expect(normalizeFsPath('C:\\A\\b.exe')).toBe('c:\\a\\b.exe');
  });

  it('findCanonicalPortableExe picks newest by mtime', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-rel-'));
    const older = path.join(dir, 'Composer-OS-Desktop-1.0.0-portable.exe');
    const newer = path.join(dir, 'Composer-OS-Desktop-2.0.0-portable.exe');
    fs.writeFileSync(older, 'x');
    fs.utimesSync(older, new Date(2000, 0, 1), new Date(2000, 0, 1));
    fs.writeFileSync(newer, 'y');
    fs.utimesSync(newer, new Date(2020, 0, 1), new Date(2020, 0, 1));
    const name = findCanonicalPortableExe(dir);
    expect(name).toBe('Composer-OS-Desktop-2.0.0-portable.exe');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
