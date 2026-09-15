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
  it('electron-builder extraResources includes martino engine (packaged Python bridge)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8')) as {
      build?: { extraResources?: Array<{ from?: string; to?: string }> };
    };
    const extras = pkg.build?.extraResources ?? [];
    const martino = extras.find((e) => e.to === 'martino');
    expect(martino).toBeDefined();
    expect(martino?.from).toContain('martino');
  });

  it('electron-builder extraResources includes Evans Musician benchmark fixture', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8')) as {
      build?: { extraResources?: Array<{ from?: string; to?: string }> };
    };
    const extras = pkg.build?.extraResources ?? [];
    const beFixture = extras.find((e) => e.to === 'test-fixtures/BE_Benchmark_LyricalBallad.musicxml');
    expect(beFixture).toBeDefined();
    expect(beFixture?.from).toContain('resources/test-fixtures/BE_Benchmark_LyricalBallad.musicxml');
  });

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
    expect(pkg.scripts['desktop:package']).toContain('electron-builder --win');
    expect(pkg.scripts['predist']).toBe('node scripts/kill-running-desktop.js');
  });

  it('electron-builder mac config is unsigned local build', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8')) as {
      scripts: Record<string, string>;
      build?: {
        extraResources?: Array<{ from?: string; to?: string }>;
        mac?: {
          icon?: string;
          category?: string;
          identity?: string | null;
          hardenedRuntime?: boolean;
          target?: Array<{ target?: string; arch?: string[] }>;
        };
      };
    };
    expect(pkg.build?.mac?.icon).toBe('resources/icon.icns');
    expect(pkg.build?.mac?.category).toBe('public.app-category.music');
    expect(pkg.build?.mac?.identity).toBeNull();
    expect(pkg.build?.mac?.hardenedRuntime).toBe(false);
    const targets = (pkg.build?.mac?.target ?? []).map((t) => t.target);
    expect(targets).toEqual(expect.arrayContaining(['dmg', 'zip']));
    expect(pkg.scripts['desktop:package:mac']).toContain('electron-builder --mac');
    expect(pkg.scripts['desktop:package:mac']).toContain('CSC_IDENTITY_AUTO_DISCOVERY=false');
    expect(pkg.scripts['desktop:package:mac']).not.toContain('bumpDesktopVersionCli');
    expect(pkg.scripts['desktop:package:mac']).not.toContain('pruneOldPortableExesCli');
    expect(pkg.scripts['desktop:package:mac']).not.toContain('verifyStableBuildOutputCli');
    expect(pkg.scripts['desktop:install:mac']).toContain('installComposerOsDesktopMac');
    const extras = pkg.build?.extraResources ?? [];
    expect(extras.some((e) => (e.from ?? '').includes('skia.win32-x64-msvc.node'))).toBe(false);
  });

  it('API bundle, IPC bundle, open-folder helpers, and UI bundle exist after build', () => {
    expect(fs.existsSync(path.join(desktopRoot, 'resources', 'api.bundle.js'))).toBe(true);
    expect(fs.existsSync(path.join(desktopRoot, 'resources', 'desktop-ipc.bundle.cjs'))).toBe(true);
    expect(fs.existsSync(path.join(desktopRoot, 'resources', 'open-folder-helpers.cjs'))).toBe(true);
    expect(fs.existsSync(path.join(desktopRoot, 'resources', 'ui', 'index.html'))).toBe(true);
    const beFixture = path.join(
      desktopRoot,
      'resources',
      'test-fixtures',
      'BE_Benchmark_LyricalBallad.musicxml'
    );
    expect(fs.existsSync(beFixture)).toBe(true);
    expect(fs.statSync(beFixture).size).toBeGreaterThan(1024);
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
