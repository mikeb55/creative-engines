/**
 * desktop:install-icon — single automation path for Desktop shortcut + launch.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { createOrUpdateComposerOsDesktopShortcut } from '../install/createDesktopShortcut';
import { LEGACY_SHORTCUT_FILE_NAME, SHORTCUT_FILE_NAME } from '../install/installDesktopIcon';

const desktopRoot = path.resolve(__dirname, '..');

describe('desktop:install-icon', () => {
  it('package.json defines desktop:install-icon and desktop:create-shortcut to the same CLI', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'));
    expect(pkg.scripts['desktop:install-icon']).toContain('installDesktopIconCli');
    expect(pkg.scripts['desktop:create-shortcut']).toBe(pkg.scripts['desktop:install-icon']);
  });

  it('installDesktopIcon resolves user Desktop, verifies portable exe, creates shortcut, launches', () => {
    const src = fs.readFileSync(path.join(desktopRoot, 'install', 'installDesktopIcon.ts'), 'utf-8');
    expect(src).toContain('verifyPackagedPortableExe');
    expect(src).toContain('createShortcut');
    expect(src).toContain('launchInstalledDesktopApp');
    expect(src).toContain('LEGACY_SHORTCUT_FILE_NAME');
    expect(src).toContain('getResolvedUserDesktopDir');
  });

  it('CLI delegates to installComposerOsDesktopIcon', () => {
    const cli = fs.readFileSync(path.join(desktopRoot, 'install', 'installDesktopIconCli.ts'), 'utf-8');
    expect(cli).toContain('installComposerOsDesktopIcon');
    expect(cli).toContain('getPublicDesktopDir');
  });

  it('createDesktopShortcut re-export uses skipLaunch for back-compat', () => {
    const src = fs.readFileSync(path.join(desktopRoot, 'install', 'createDesktopShortcut.ts'), 'utf-8');
    expect(src).toContain('skipLaunch: true');
  });

  it('throws a clear error when no portable exe exists in release dir (Windows)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-icon-empty-'));
    fs.mkdirSync(path.join(dir, 'release'));
    try {
      if (process.platform !== 'win32') {
        expect(() => createOrUpdateComposerOsDesktopShortcut(dir)).toThrow(/Windows-only/i);
      } else {
        expect(() => createOrUpdateComposerOsDesktopShortcut(dir)).toThrow(/No packaged portable exe/i);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('exactly one canonical shortcut name; legacy filename removed by install', () => {
    expect(SHORTCUT_FILE_NAME).toBe('Composer OS.lnk');
    expect(LEGACY_SHORTCUT_FILE_NAME).toBe('Composer OS Desktop.lnk');
    const src = fs.readFileSync(path.join(desktopRoot, 'install', 'installDesktopIcon.ts'), 'utf-8');
    expect(src).toContain('unlinkSync(legacyPath)');
  });

  it('installComposerOsDesktop delegates to installComposerOsDesktopIcon after cleanup', () => {
    const src = fs.readFileSync(path.join(desktopRoot, 'install', 'installComposerOsDesktop.ts'), 'utf-8');
    expect(src).toContain('installComposerOsDesktopIcon');
    expect(src).toContain('cleanupLegacyShortcuts');
  });
});
