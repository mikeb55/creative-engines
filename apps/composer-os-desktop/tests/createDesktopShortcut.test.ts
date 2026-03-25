/**
 * desktop:create-shortcut wiring and failure modes.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  createOrUpdateComposerOsDesktopShortcut,
  SHORTCUT_FILE_NAME,
} from '../install/createDesktopShortcut';

const desktopRoot = path.resolve(__dirname, '..');

describe('desktop:create-shortcut', () => {
  it('package.json defines desktop:create-shortcut using createDesktopShortcutCli', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'));
    expect(pkg.scripts['desktop:create-shortcut']).toContain('createDesktopShortcutCli');
    expect(pkg.scripts['desktop:create-shortcut']).toContain('tsx');
  });

  it('install helper uses verifyPackagedDesktop + shortcutUtils (portable exe + .lnk, no full-install scan)', () => {
    const src = fs.readFileSync(path.join(desktopRoot, 'install', 'createDesktopShortcut.ts'), 'utf-8');
    expect(src).toContain('verifyPackagedPortableExe');
    expect(src).toContain('createShortcut');
    expect(src).not.toContain('cleanupLegacyShortcuts');
  });

  it('CLI entry delegates to createOrUpdateComposerOsDesktopShortcut', () => {
    const cli = fs.readFileSync(path.join(desktopRoot, 'install', 'createDesktopShortcutCli.ts'), 'utf-8');
    expect(cli).toContain('createOrUpdateComposerOsDesktopShortcut');
  });

  it('throws a clear error when no portable exe exists in release dir (Windows)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-shortcut-empty-'));
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

  it('shortcut file name is Composer OS.lnk', () => {
    expect(SHORTCUT_FILE_NAME).toBe('Composer OS.lnk');
  });
});
