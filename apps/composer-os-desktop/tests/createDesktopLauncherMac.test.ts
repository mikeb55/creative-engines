/**
 * macOS Desktop launcher wiring (static — does not write ~/Desktop).
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  LAUNCHER_BUNDLE_ID,
  LAUNCHER_DISPLAY_NAME,
  buildLaunchScript,
} from '../install/createDesktopLauncherMac';

const desktopRoot = path.resolve(__dirname, '..');

describe('createDesktopLauncherMac', () => {
  it('keeps launcher bundle id distinct from the packaged desktop app', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'));
    expect(LAUNCHER_BUNDLE_ID).toBe('com.mikeb55.composeros.launcher');
    expect(pkg.build.appId).toBe('com.mikeb55.composeros.desktop');
    expect(LAUNCHER_BUNDLE_ID).not.toBe(pkg.build.appId);
    expect(LAUNCHER_DISPLAY_NAME).toBe('Composer OS');
  });

  it('bakes absolute node/npm/repo paths and never sources zshrc', () => {
    const script = buildLaunchScript({
      nodePath: '/usr/local/bin/node',
      npmPath: '/usr/local/bin/npm',
      repoRoot: '/repo',
      desktopAppRoot: '/repo/apps/composer-os-desktop',
      electronPath: '/repo/apps/composer-os-desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
    });
    expect(script).toContain("NODE='/usr/local/bin/node'");
    expect(script).toContain("NPM='/usr/local/bin/npm'");
    expect(script).toContain("REPO='/repo'");
    expect(script).not.toMatch(/source\s+~\/\.zshrc/);
    expect(script).not.toMatch(/source\s+~\/\.bashrc/);
    expect(script).toContain('launcherFingerprint.js');
    expect(script).toContain('verify-ui-after-copy.js');
    expect(script).toContain('run build:ui');
    expect(script).toContain('verify:ui-resources');
    expect(script).toContain('rebuilding latest changes');
    expect(script).toContain('Open Log');
    expect(script).toContain('dev_electron_running');
    expect(script).toContain('printf');
  });

  it('does not write the fingerprint stamp before a successful verify', () => {
    const script = buildLaunchScript({
      nodePath: '/n',
      npmPath: '/m',
      repoRoot: '/r',
      desktopAppRoot: '/d',
      electronPath: '/e',
    });
    const stampWrite = script.lastIndexOf('>"$STAMP"');
    const verify = script.indexOf('verify:ui-resources');
    const rcFail = script.indexOf('if [ "$RC" -ne 0 ]');
    expect(verify).toBeGreaterThan(0);
    expect(rcFail).toBeGreaterThan(verify);
    expect(stampWrite).toBeGreaterThan(rcFail);
  });
});

