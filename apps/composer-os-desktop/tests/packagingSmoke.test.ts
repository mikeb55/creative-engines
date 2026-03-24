/**
 * Internal packaging / desktop path sanity (no manual steps).
 */
import * as fs from 'fs';
import * as path from 'path';

const desktopRoot = path.resolve(__dirname, '..');

function readUtf8(rel: string): string {
  return fs.readFileSync(path.join(desktopRoot, rel), 'utf-8');
}

describe('Packaging smoke (desktop)', () => {
  it('electron-builder config is present and icon resolves', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'));
    expect(pkg.build?.productName).toBe('Composer OS Desktop');
    expect(pkg.build?.appId).toBe('com.mikeb55.composeros.desktop');
    expect(pkg.build?.win?.icon).toBeDefined();
    expect(pkg.build?.win?.signAndEditExecutable).toBe(false);
    const iconRel = pkg.build.win.icon as string;
    expect(fs.existsSync(path.join(desktopRoot, iconRel))).toBe(true);
  });

  it('desktop:package disables auto code-sign discovery (avoids winCodeSign symlink failures)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'));
    expect(pkg.scripts['desktop:package']).toContain('CSC_IDENTITY_AUTO_DISCOVERY=false');
    expect(pkg.scripts['desktop:package']).toContain('electron-builder');
  });

  it('API bundle, IPC bundle, open-folder helpers, and UI bundle exist after build', () => {
    expect(fs.existsSync(path.join(desktopRoot, 'resources', 'api.bundle.js'))).toBe(true);
    expect(fs.existsSync(path.join(desktopRoot, 'resources', 'desktop-ipc.bundle.cjs'))).toBe(true);
    expect(fs.existsSync(path.join(desktopRoot, 'resources', 'open-folder-helpers.cjs'))).toBe(true);
    expect(fs.existsSync(path.join(desktopRoot, 'resources', 'ui', 'index.html'))).toBe(true);
    const stampPath = path.join(desktopRoot, 'resources', 'ui', 'composer-os-ui-stamp.json');
    expect(fs.existsSync(stampPath)).toBe(true);
    const stamp = JSON.parse(fs.readFileSync(stampPath, 'utf-8')) as { productId: string; appShellVersion: string };
    expect(stamp.productId).toBe('composer-os');
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8')) as { version: string };
    expect(stamp.appShellVersion).toBe(pkg.version);
  });

  it('main and preload have no python or composer-studio references', () => {
    const mainSrc = readUtf8('electron/main.ts');
    const preloadSrc = readUtf8('electron/preload.ts');
    const configSrc = readUtf8('electron/config.ts');
    for (const s of [mainSrc, preloadSrc, configSrc]) {
      expect(s.toLowerCase()).not.toContain('python');
      expect(s.toLowerCase()).not.toContain('.py');
      expect(s).not.toMatch(/composer-studio/i);
    }
  });

  it('dist main and preload compiled', () => {
    expect(fs.existsSync(path.join(desktopRoot, 'dist', 'main.js'))).toBe(true);
    expect(fs.existsSync(path.join(desktopRoot, 'dist', 'preload.js'))).toBe(true);
  });
});
